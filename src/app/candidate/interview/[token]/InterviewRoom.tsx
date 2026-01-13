"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { VideoRoom } from "@/components/VideoRoom";
import { TranscriptPanel, TranscriptMessage } from "@/components/TranscriptPanel";
import { AIAvatar } from "@/components/AIAvatar";
import { PauseIndicator } from "@/components/PauseIndicator";
import { AudioCapture } from "@/lib/audio/capture";
import { AudioBuffer } from "@/lib/audio/buffer";
import { speakText, stopSpeaking, setAudioContext } from "@/lib/audio/tts-client";
import { initializeFillers, playRandomFiller, setFillerAudioContext } from "@/lib/audio/fillers";

// Fetch with timeout - prevents hanging on slow/failed requests
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 45000 // 45 second default timeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out - please try again");
    }
    throw error;
  }
}

interface InterviewRoomProps {
  interviewToken: string;
  candidateName: string;
}

interface RtcCredentials {
  token: string;
  roomName: string;
  participantName: string;
  interviewId: string;
}

type InterviewPhase =
  | "not_started"
  | "connecting"
  | "waiting_for_stream"
  | "ai_speaking"
  | "listening"
  | "detecting_pause"
  | "processing"
  | "completed";

interface CurrentQuestion {
  id: string;
  prompt: string;
  index: number;
  total: number;
}

export function InterviewRoom({ interviewToken, candidateName }: InterviewRoomProps) {
  const router = useRouter();
  const [credentials, setCredentials] = useState<RtcCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<InterviewPhase>("not_started");
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [followupsUsed, setFollowupsUsed] = useState(0);
  const [pauseProgress, setPauseProgress] = useState(0);

  // Use refs for values that callbacks need but shouldn't cause re-renders
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null); // Created on user click for iOS Safari
  const isProcessingRef = useRef(false);
  const pendingInterviewStartRef = useRef<string | null>(null);
  const credentialsRef = useRef<RtcCredentials | null>(null);
  const phaseRef = useRef<InterviewPhase>("not_started");
  const currentQuestionRef = useRef<CurrentQuestion | null>(null);
  const followupsUsedRef = useRef(0);
  const streamInitializedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { credentialsRef.current = credentials; }, [credentials]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
  useEffect(() => { followupsUsedRef.current = followupsUsed; }, [followupsUsed]);

  const addMessage = useCallback((speaker: "interviewer" | "candidate", text: string) => {
    setMessages((prev) => [...prev, { speaker, text, timestamp: new Date() }]);
  }, []);

  // Helper to speak text with graceful error handling for iOS Safari
  const safeSpeakText = useCallback(async (
    text: string,
    options?: { interviewId?: string; questionId?: string }
  ) => {
    try {
      await speakText(text, options);
    } catch (e) {
      // TTS failed (possibly iOS audio restriction) - continue without audio
      console.warn("TTS failed, continuing without audio:", e);
      // Give user time to read the text
      await new Promise(resolve => setTimeout(resolve, Math.min(text.length * 50, 5000)));
    }
  }, []);

  // Handle pause completion - submit the answer (uses refs for stability)
  const handlePauseComplete = useCallback(async () => {
    const creds = credentialsRef.current;
    if (isProcessingRef.current || !creds || !audioBufferRef.current) return;
    
    isProcessingRef.current = true;
    setPhase("processing");
    setPauseProgress(0);

    // Play conversational filler immediately (non-blocking) for natural feel
    playRandomFiller().catch(() => {}); // Fire and forget

    try {
      if (audioBufferRef.current.isEmpty()) {
        setPhase("listening");
        isProcessingRef.current = false;
        return;
      }

      const wavBlob = audioBufferRef.current.toWavBlob();
      audioBufferRef.current.clear();

      // Transcribe with retry
      const formData = new FormData();
      formData.append("audio", wavBlob, "audio.wav");
      formData.append("interviewId", creds.interviewId);

      let sttData;
      try {
        const sttRes = await fetchWithTimeout("/api/speech/stt", {
          method: "POST",
          body: formData,
        }, 30000); // 30 second timeout for STT
        sttData = await sttRes.json();
        if (!sttRes.ok) {
          throw new Error(sttData.error || "Failed to transcribe");
        }
      } catch (e) {
        console.error("STT error:", e);
        // On STT failure, let user try again
        setError("Having trouble processing - please try speaking again");
        audioCaptureRef.current?.enableDetection();
        setPhase("listening");
        isProcessingRef.current = false;
        return;
      }

      const candidateAnswer = sttData.transcript;

      if (!candidateAnswer?.trim()) {
        audioCaptureRef.current?.enableDetection();
        setPhase("listening");
        isProcessingRef.current = false;
        return;
      }

      addMessage("candidate", candidateAnswer);

      // Send to next-turn API with timeout
      let nextData;
      try {
        const nextRes = await fetchWithTimeout("/api/interviews/next-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewId: creds.interviewId,
            candidateAnswer,
            followupsUsed: followupsUsedRef.current,
            currentQuestionPrompt: currentQuestionRef.current?.prompt, // For dynamic mode conversation history
          }),
        }, 50000); // 50 second timeout for next-turn (allows for AI generation)
        nextData = await nextRes.json();
        if (!nextRes.ok) {
          throw new Error(nextData.error || "Failed to process answer");
        }
      } catch (e) {
        console.error("Next-turn error:", e);
        setError("Taking too long - please click to retry");
        audioCaptureRef.current?.enableDetection();
        setPhase("listening");
        isProcessingRef.current = false;
        return;
      }

      // Handle response
      if (nextData.action === "complete") {
        addMessage("interviewer", "Thank you for completing the interview!");
        
        // Disable detection for final message
        audioCaptureRef.current?.disableDetection();
        setPhase("ai_speaking");
        await safeSpeakText(
          "Thank you for completing the interview. We will be in touch soon."
        );

        // Finalize scoring - wrap in try-catch to ensure completion flow continues
        try {
          await fetch("/api/interviews/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interviewId: creds.interviewId }),
          });
        } catch (e) {
          console.error("End interview API error (continuing):", e);
        }

        setPhase("completed");
        isProcessingRef.current = false;
        return;
      }

      if (nextData.action === "followup") {
        setFollowupsUsed(nextData.followupsUsed || 1);
        // Handle both static mode (prompt directly) and hybrid mode (question object)
        const followUpPrompt = nextData.question?.prompt || nextData.prompt;
        addMessage("interviewer", followUpPrompt);

        // Disable detection while AI speaks follow-up
        audioCaptureRef.current?.disableDetection();
        setPhase("ai_speaking");
        
        await safeSpeakText(followUpPrompt, {
          interviewId: creds.interviewId,
          questionId: nextData.question?.id || currentQuestionRef.current?.id,
        });

        // Enable detection after follow-up is complete
        audioCaptureRef.current?.enableDetection();
        setPhase("listening");
        isProcessingRef.current = false;
        return;
      }

      if (nextData.action === "next_question") {
        setFollowupsUsed(0);
        setCurrentQuestion({
          id: nextData.question.id,
          prompt: nextData.question.prompt,
          index: nextData.questionIndex,
          total: nextData.totalQuestions,
        });

        addMessage("interviewer", nextData.question.prompt);

        // Disable detection while AI speaks next question
        audioCaptureRef.current?.disableDetection();
        setPhase("ai_speaking");
        
        await safeSpeakText(nextData.question.prompt, {
          interviewId: creds.interviewId,
          questionId: nextData.question.id,
        });

        // Enable detection after question is complete
        audioCaptureRef.current?.enableDetection();
        setPhase("listening");
      }

      isProcessingRef.current = false;
    } catch (e) {
      console.error("Process audio error:", e);
      setError(e instanceof Error ? e.message : "Failed to process answer");
      isProcessingRef.current = false;
    }
  }, [addMessage, safeSpeakText]);

  // Start the actual interview questions
  const startInterviewQuestions = useCallback(async (interviewId: string) => {
    try {
      const startRes = await fetch("/api/interviews/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId }),
      });

      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(startData.error || "Failed to start interview");
      }

      setCurrentQuestion({
        id: startData.question.id,
        prompt: startData.question.prompt,
        index: startData.questionIndex,
        total: startData.totalQuestions,
      });

      addMessage("interviewer", startData.question.prompt);

      // Disable detection while AI speaks (prevents background noise interruption)
      audioCaptureRef.current?.disableDetection();
      setPhase("ai_speaking");
      
      await safeSpeakText(startData.question.prompt, {
        interviewId,
        questionId: startData.question.id,
      });

      // Enable detection after question is complete
      audioCaptureRef.current?.enableDetection();
      setPhase("listening");
    } catch (e) {
      console.error("startInterviewQuestions error:", e);
      setError(e instanceof Error ? e.message : "Failed to start interview");
      setPhase("not_started");
    }
  }, [addMessage, safeSpeakText]);

  // Handle audio stream from VideoRoom - STABLE callback (no dependencies that change)
  const handleAudioStream = useCallback((stream: MediaStream) => {
    // Only initialize once
    if (streamInitializedRef.current) return;
    streamInitializedRef.current = true;
    
    console.log("Audio stream received from VideoRoom");
    
    // Initialize audio buffer
    audioBufferRef.current = new AudioBuffer();
    
    // Create AudioCapture with the shared stream and pre-created AudioContext
    // The audioContext was created in startInterview() during user gesture for iOS Safari compatibility
    // Uses optimized defaults: 1.5s delay, 3.5s total, 500ms min speech, 0.02 RMS threshold
    const capture = new AudioCapture({
      existingStream: stream,
      audioContext: audioContextRef.current ?? undefined, // Pass pre-created context for iOS
      onAudioData: (pcm) => {
        audioBufferRef.current?.addChunk(pcm);
      },
      onSilenceStart: () => {
        if (phaseRef.current === "listening") {
          setPhase("detecting_pause");
        }
      },
      onSpeechResume: () => {
        if (phaseRef.current === "detecting_pause") {
          setPhase("listening");
          setPauseProgress(0);
        }
      },
      onPauseProgress: (progress) => {
        setPauseProgress(progress);
      },
      onPauseComplete: () => {
        // Only trigger if we're in the right phase
        if (phaseRef.current === "detecting_pause" || phaseRef.current === "listening") {
          handlePauseComplete();
        }
      },
      // No onSpeechDetected - detection is disabled during AI speech anyway
    });

    audioCaptureRef.current = capture;
    
    // Start with detection disabled until first question is asked
    capture.disableDetection();

    capture.start().then(() => {
      console.log("AudioCapture started with shared stream (detection disabled until AI speaks)");
      
      // If there's a pending interview start, do it now
      if (pendingInterviewStartRef.current) {
        startInterviewQuestions(pendingInterviewStartRef.current);
        pendingInterviewStartRef.current = null;
      }
    }).catch((e) => {
      console.error("Failed to start AudioCapture:", e);
      setError("Failed to initialize audio processing");
    });
  }, [handlePauseComplete, startInterviewQuestions]);

  // Start the interview
  const startInterview = async () => {
    setError(null);
    setPhase("connecting");
    streamInitializedRef.current = false;

    // === iOS Safari Audio Unlock ===
    // Both AudioContext and HTML Audio need to be "unlocked" during a user gesture.
    // We do this synchronously before any async operations.
    
    // 1. Create and resume AudioContext (for audio processing AND TTS playback on iOS)
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        // Resume immediately in user gesture
        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }
        // Share with TTS client and filler audio for iOS Safari audio playback
        setAudioContext(audioContextRef.current);
        setFillerAudioContext(audioContextRef.current);
        console.log("AudioContext created, resumed, and shared with TTS/filler clients");
      } catch (e) {
        console.error("Failed to create AudioContext:", e);
      }
    }
    
    // Pre-warm filler audio cache in background (for instant playback later)
    initializeFillers().catch(() => {});
    
    // 2. Play silent audio to unlock HTML Audio API (for TTS playback)
    // IMPORTANT: Do NOT await this - keep it synchronous to preserve user gesture context
    try {
      const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
      silentAudio.volume = 0.01;
      // Fire and forget - the play() call itself unlocks audio on iOS
      silentAudio.play().then(() => {
        silentAudio.pause();
        console.log("HTML Audio unlocked for iOS Safari");
      }).catch(() => {
        console.log("Silent audio play failed - may affect TTS on iOS");
      });
    } catch (e) {
      // Ignore - this is just a best-effort unlock
    }

    try {
      const rtcRes = await fetch("/api/rtc/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewToken }),
      });

      const rtcData = await rtcRes.json();
      if (!rtcRes.ok) {
        throw new Error(rtcData.error || "Failed to get room credentials");
      }

      setCredentials(rtcData);
      pendingInterviewStartRef.current = rtcData.interviewId;
      setPhase("waiting_for_stream");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start interview");
      setPhase("not_started");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioCaptureRef.current?.stop();
      stopSpeaking();
      // Close the AudioContext if we created it
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Redirect to scheduling page when interview completes
  useEffect(() => {
    if (phase === "completed") {
      // Small delay for the user to see completion message before redirect
      const timer = setTimeout(() => {
        router.push(`/candidate/interview-schedule/${interviewToken}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, router, interviewToken]);

  // Derive avatar state from phase
  const avatarState = 
    phase === "ai_speaking" ? "speaking" :
    phase === "processing" ? "thinking" :
    phase === "listening" || phase === "detecting_pause" ? "listening" :
    "idle";

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 p-8">
        <div className="p-8 bg-zinc-800 rounded-xl text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setPhase("not_started");
            }}
            className="px-6 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (phase === "not_started") {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 p-8">
        <div className="text-center max-w-lg">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome, {candidateName}</h1>
            <p className="text-zinc-400">Your interview will begin shortly</p>
          </div>
          <div className="p-8 bg-zinc-800/50 backdrop-blur rounded-2xl border border-zinc-700">
            <p className="text-zinc-300 mb-4">
              When you&apos;re ready, click below to start your interview.
            </p>
            <p className="text-zinc-500 text-sm mb-6">
              Make sure your camera and microphone are working. Speak naturally and the system
              will detect when you&apos;ve finished answering.
            </p>
            <button
              onClick={startInterview}
              className="px-10 py-4 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors text-lg"
            >
              Start Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "completed") {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-600 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-emerald-400 mb-3">Interview Complete!</h1>
          <p className="text-zinc-300 text-lg mb-2">Thank you for taking the time to chat with us.</p>
          <p className="text-zinc-500 animate-pulse">Redirecting to schedule your on-site interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header - compact on mobile */}
      <header className="px-3 py-2 md:px-6 md:py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm md:text-lg font-semibold text-white truncate">{candidateName}</h1>
          <p className="text-xs md:text-sm text-zinc-500 hidden sm:block">Interview in progress</p>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <span
            className={`px-2 py-1 md:px-3 md:py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              phase === "ai_speaking"
                ? "bg-blue-500/20 text-blue-400"
                : phase === "detecting_pause"
                ? "bg-amber-500/20 text-amber-400"
                : phase === "processing"
                ? "bg-purple-500/20 text-purple-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {phase === "ai_speaking" && "Speaking"}
            {phase === "listening" && "Listening"}
            {phase === "detecting_pause" && "Listening..."}
            {phase === "processing" && "Processing"}
            {(phase === "connecting" || phase === "waiting_for_stream") && "Connecting..."}
          </span>
        </div>
      </header>

      {/* Main content - responsive layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Video area - takes full width on mobile */}
        <div className="flex-1 p-2 md:p-4 flex flex-col min-w-0">
          <div className="flex-1 relative rounded-xl overflow-hidden min-h-0">
            {credentials && (
              <VideoRoom
                token={credentials.token}
                roomName={credentials.roomName}
                onDisconnect={() => {}}
                onAudioStream={handleAudioStream}
              >
                {/* AI Avatar overlay - bottom right */}
                <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4">
                  <AIAvatar state={avatarState} size="md" />
                </div>
              </VideoRoom>
            )}
          </div>

          {/* Status bar - simplified on mobile */}
          <div className="mt-2 md:mt-4 px-3 py-2 md:px-4 md:py-3 bg-zinc-800/50 rounded-xl border border-zinc-700 shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
              {phase === "detecting_pause" && (
                <PauseIndicator active={true} progress={pauseProgress} />
              )}
              {phase === "listening" && (
                <span className="text-xs md:text-sm text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Speak your answer...
                </span>
              )}
              {phase === "ai_speaking" && (
                <span className="text-xs md:text-sm text-blue-400">
                  Listening to interviewer...
                </span>
              )}
              {phase === "processing" && (
                <span className="text-xs md:text-sm text-purple-400 animate-pulse">
                  Processing...
                </span>
              )}
              {(phase === "connecting" || phase === "waiting_for_stream") && (
                <span className="text-xs md:text-sm text-zinc-400 animate-pulse">
                  Setting up...
                </span>
              )}
            </div>

            {/* Current question - hidden on mobile, shown on tablet+ */}
            {currentQuestion && (
              <p className="hidden md:block text-sm text-zinc-400 max-w-md truncate mt-2">
                {currentQuestion.prompt}
              </p>
            )}
          </div>
        </div>

        {/* Transcript panel - hidden on mobile (portrait), shown on tablet/desktop */}
        <div className="hidden lg:block w-80 border-l border-zinc-800 p-4 shrink-0">
          <TranscriptPanel messages={messages} />
        </div>
      </div>
    </div>
  );
}
