"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VideoRoom } from "@/components/VideoRoom";
import { TranscriptPanel, TranscriptMessage } from "@/components/TranscriptPanel";
import { AIAvatar } from "@/components/AIAvatar";
import { PauseIndicator } from "@/components/PauseIndicator";
import { AudioCapture } from "@/lib/audio/capture";
import { AudioBuffer } from "@/lib/audio/buffer";
import { speakText, stopSpeaking } from "@/lib/audio/tts-client";

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

  // Handle pause completion - submit the answer (uses refs for stability)
  const handlePauseComplete = useCallback(async () => {
    const creds = credentialsRef.current;
    if (isProcessingRef.current || !creds || !audioBufferRef.current) return;
    
    isProcessingRef.current = true;
    setPhase("processing");
    setPauseProgress(0);

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
        const sttRes = await fetch("/api/speech/stt", {
          method: "POST",
          body: formData,
        });
        sttData = await sttRes.json();
        if (!sttRes.ok) {
          throw new Error(sttData.error || "Failed to transcribe");
        }
      } catch (e) {
        console.error("STT error:", e);
        // On STT failure, let user try again
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

      // Send to next-turn API with retry
      let nextData;
      try {
        const nextRes = await fetch("/api/interviews/next-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interviewId: creds.interviewId,
            candidateAnswer,
            followupsUsed: followupsUsedRef.current,
          }),
        });
        nextData = await nextRes.json();
        if (!nextRes.ok) {
          throw new Error(nextData.error || "Failed to process answer");
        }
      } catch (e) {
        console.error("Next-turn error:", e);
        setError("Connection issue - please refresh and continue");
        isProcessingRef.current = false;
        return;
      }

      // Handle response
      if (nextData.action === "complete") {
        addMessage("interviewer", "Thank you for completing the interview!");
        
        // Disable detection for final message
        audioCaptureRef.current?.disableDetection();
        setPhase("ai_speaking");
        await speakText(
          "Thank you for completing the interview. We will be in touch soon."
        );

        // Finalize scoring
        await fetch("/api/interviews/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewId: creds.interviewId }),
        });

        setPhase("completed");
        isProcessingRef.current = false;
        return;
      }

      if (nextData.action === "followup") {
        setFollowupsUsed(nextData.followupsUsed);
        addMessage("interviewer", nextData.prompt);

        // Disable detection while AI speaks follow-up
        audioCaptureRef.current?.disableDetection();
        setPhase("ai_speaking");
        
        await speakText(nextData.prompt, {
          interviewId: creds.interviewId,
          questionId: currentQuestionRef.current?.id,
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
        
        await speakText(nextData.question.prompt, {
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
  }, [addMessage]);

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
      
      await speakText(startData.question.prompt, {
        interviewId,
        questionId: startData.question.id,
      });

      // Enable detection after question is complete
      audioCaptureRef.current?.enableDetection();
      setPhase("listening");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start interview");
      setPhase("not_started");
    }
  }, [addMessage]);

  // Handle audio stream from VideoRoom - STABLE callback (no dependencies that change)
  const handleAudioStream = useCallback((stream: MediaStream) => {
    // Only initialize once
    if (streamInitializedRef.current) return;
    streamInitializedRef.current = true;
    
    console.log("Audio stream received from VideoRoom");
    
    // Initialize audio buffer
    audioBufferRef.current = new AudioBuffer();
    
    // Create AudioCapture with the shared stream
    // Uses optimized defaults: 1.5s delay, 3.5s total, 500ms min speech, 0.02 RMS threshold
    const capture = new AudioCapture({
      existingStream: stream,
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
    };
  }, []);

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
        <div className="text-center max-w-2xl">
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-600 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-emerald-400 mb-2">Interview Complete!</h1>
            <p className="text-zinc-400">Thank you, {candidateName}</p>
          </div>
          <div className="p-6 bg-zinc-800/50 backdrop-blur rounded-2xl border border-zinc-700">
            <p className="text-zinc-300 mb-6">
              We will review your responses and be in touch soon.
            </p>
            <div className="text-left max-h-64 overflow-y-auto">
              <TranscriptPanel messages={messages} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">{candidateName}</h1>
          <p className="text-sm text-zinc-500">Interview in progress</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            Question {(currentQuestion?.index ?? 0) + 1} of {currentQuestion?.total ?? "?"}
          </span>
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              phase === "ai_speaking"
                ? "bg-blue-500/20 text-blue-400"
                : phase === "detecting_pause"
                ? "bg-amber-500/20 text-amber-400"
                : phase === "processing"
                ? "bg-purple-500/20 text-purple-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}
          >
            {phase === "ai_speaking" && "Interviewer Speaking"}
            {phase === "listening" && "Listening"}
            {phase === "detecting_pause" && "Listening..."}
            {phase === "processing" && "Processing"}
            {(phase === "connecting" || phase === "waiting_for_stream") && "Connecting..."}
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex-1 relative rounded-xl overflow-hidden">
            {credentials && (
              <VideoRoom
                token={credentials.token}
                roomName={credentials.roomName}
                onDisconnect={() => {}}
                onAudioStream={handleAudioStream}
              >
                {/* AI Avatar overlay - bottom right */}
                <div className="absolute bottom-4 right-4">
                  <AIAvatar state={avatarState} size="md" />
                </div>
              </VideoRoom>
            )}
          </div>

          {/* Status bar */}
          <div className="mt-4 px-4 py-3 bg-zinc-800/50 rounded-xl border border-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {phase === "detecting_pause" && (
                <PauseIndicator active={true} progress={pauseProgress} />
              )}
              {phase === "listening" && (
                <span className="text-sm text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Speak your answer...
                </span>
              )}
              {phase === "ai_speaking" && (
                <span className="text-sm text-blue-400">
                  Listening to interviewer...
                </span>
              )}
              {phase === "processing" && (
                <span className="text-sm text-purple-400 animate-pulse">
                  Processing your response...
                </span>
              )}
              {(phase === "connecting" || phase === "waiting_for_stream") && (
                <span className="text-sm text-zinc-400 animate-pulse">
                  Setting up your interview...
                </span>
              )}
            </div>

            {currentQuestion && (
              <p className="text-sm text-zinc-400 max-w-md truncate">
                {currentQuestion.prompt}
              </p>
            )}
          </div>
        </div>

        {/* Transcript panel */}
        <div className="w-80 border-l border-zinc-800 p-4">
          <TranscriptPanel messages={messages} />
        </div>
      </div>
    </div>
  );
}
