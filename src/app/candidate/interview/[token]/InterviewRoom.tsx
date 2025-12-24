"use client";

import { useState, useEffect, useRef } from "react";
import { VideoRoom } from "@/components/VideoRoom";
import { speakText } from "@/lib/audio/tts-client";

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
  | "ai_speaking"
  | "listening"
  | "recording"
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
  const [transcript, setTranscript] = useState<string[]>([]);
  const [followupsUsed, setFollowupsUsed] = useState(0);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const addToTranscript = (speaker: string, text: string) => {
    setTranscript((prev) => [...prev, `${speaker}: ${text}`]);
  };

  // Start the interview
  const startInterview = async () => {
    setError(null);
    setPhase("connecting");

    try {
      // Get RTC credentials
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

      // Start the interview
      const startRes = await fetch("/api/interviews/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId: rtcData.interviewId }),
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

      addToTranscript("AI", startData.question.prompt);

      // Speak the question
      setPhase("ai_speaking");
      await speakText(startData.question.prompt, {
        interviewId: rtcData.interviewId,
        questionId: startData.question.id,
      });

      // Ready to listen
      setPhase("listening");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start interview");
      setPhase("not_started");
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.start();
      setPhase("recording");
    } catch (e) {
      setError("Failed to access microphone");
    }
  };

  // Stop recording and process
  const stopRecording = async () => {
    if (!mediaRecorder.current || !credentials) return;

    setPhase("processing");

    return new Promise<void>((resolve) => {
      mediaRecorder.current!.onstop = async () => {
        // Stop media stream
        mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop());

        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        await processAudio(audioBlob, credentials.interviewId);
        resolve();
      };

      mediaRecorder.current!.stop();
    });
  };

  const processAudio = async (audioBlob: Blob, interviewId: string) => {
    try {
      // Transcribe
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("interviewId", interviewId);

      const sttRes = await fetch("/api/speech/stt", {
        method: "POST",
        body: formData,
      });

      const sttData = await sttRes.json();
      if (!sttRes.ok) {
        throw new Error(sttData.error || "Failed to transcribe");
      }

      const candidateAnswer = sttData.transcript;

      if (!candidateAnswer?.trim()) {
        setPhase("listening");
        return;
      }

      addToTranscript("You", candidateAnswer);

      // Send to next-turn API
      const nextRes = await fetch("/api/interviews/next-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          candidateAnswer,
          followupsUsed,
        }),
      });

      const nextData = await nextRes.json();
      if (!nextRes.ok) {
        throw new Error(nextData.error || "Failed to process answer");
      }

      // Handle response
      if (nextData.action === "complete") {
        addToTranscript("AI", "Thank you for completing the interview!");
        setPhase("ai_speaking");
        await speakText(
          "Thank you for completing the interview. We will be in touch soon."
        );

        // Finalize scoring
        await fetch("/api/interviews/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewId }),
        });

        setPhase("completed");
        return;
      }

      if (nextData.action === "followup") {
        setFollowupsUsed(nextData.followupsUsed);
        addToTranscript("AI", nextData.prompt);

        setPhase("ai_speaking");
        await speakText(nextData.prompt, {
          interviewId,
          questionId: currentQuestion?.id,
        });

        setPhase("listening");
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

        addToTranscript("AI", nextData.question.prompt);

        setPhase("ai_speaking");
        await speakText(nextData.question.prompt, {
          interviewId,
          questionId: nextData.question.id,
        });

        setPhase("listening");
      }
    } catch (e) {
      console.error("Process audio error:", e);
      setError(e instanceof Error ? e.message : "Failed to process answer");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <div className="p-8 bg-zinc-800 rounded text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setPhase("not_started");
          }}
          className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (phase === "not_started") {
    return (
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Welcome, {candidateName}</h1>
          <p className="text-zinc-400">Your interview will begin shortly</p>
        </div>
        <div className="p-8 bg-zinc-800 rounded">
          <p className="text-zinc-300 mb-4">
            When you&apos;re ready, click below to start your interview.
          </p>
          <p className="text-zinc-500 text-sm mb-6">
            Make sure your camera and microphone are working.
          </p>
          <button
            onClick={startInterview}
            className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  if (phase === "completed") {
    return (
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-green-400">Interview Complete!</h1>
          <p className="text-zinc-400">Thank you, {candidateName}</p>
        </div>
        <div className="p-8 bg-zinc-800 rounded">
          <p className="text-zinc-300 mb-6">
            We will review your responses and be in touch soon.
          </p>
          <div className="text-left max-h-64 overflow-y-auto bg-zinc-900 p-4 rounded">
            <p className="text-zinc-500 text-xs mb-2">Interview Summary</p>
            {transcript.map((line, i) => (
              <p key={i} className="text-zinc-400 text-sm mb-1">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-white">{candidateName}</h1>
        <p className="text-zinc-400">Interview in progress</p>
      </div>
      
      {credentials && (
        <VideoRoom
          token={credentials.token}
          roomName={credentials.roomName}
          onDisconnect={() => {}}
        />
      )}

      {/* Status Bar */}
      <div className="p-4 bg-zinc-800 rounded">
        <div className="flex justify-between items-center mb-2">
          <span className="text-zinc-400 text-sm">
            Question {(currentQuestion?.index ?? 0) + 1} of{" "}
            {currentQuestion?.total ?? "?"}
          </span>
          <span
            className={`px-3 py-1 rounded text-sm ${
              phase === "ai_speaking"
                ? "bg-blue-600 text-white"
                : phase === "recording"
                ? "bg-red-600 text-white animate-pulse"
                : phase === "processing"
                ? "bg-yellow-600 text-white"
                : phase === "listening"
                ? "bg-green-600 text-white"
                : "bg-zinc-700 text-zinc-300"
            }`}
          >
            {phase === "ai_speaking" && "🔊 AI Speaking..."}
            {phase === "listening" && "Ready"}
            {phase === "recording" && "🔴 Recording..."}
            {phase === "processing" && "⏳ Processing..."}
            {phase === "connecting" && "Connecting..."}
          </span>
        </div>

        {currentQuestion && (
          <p className="text-white mb-4">{currentQuestion.prompt}</p>
        )}

        {/* Recording Controls */}
        {phase === "listening" && (
          <button
            onClick={startRecording}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            🎤 Hold to Record Answer
          </button>
        )}

        {phase === "recording" && (
          <button
            onClick={stopRecording}
            className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 animate-pulse"
          >
            ⏹️ Stop Recording & Submit
          </button>
        )}

        {(phase === "ai_speaking" || phase === "processing") && (
          <div className="w-full py-3 bg-zinc-700 text-zinc-400 rounded-lg text-center">
            {phase === "ai_speaking" ? "Please wait..." : "Processing your answer..."}
          </div>
        )}
      </div>

      {/* Live Transcript */}
      <div className="p-4 bg-zinc-800 rounded max-h-48 overflow-y-auto">
        <p className="text-zinc-500 text-xs mb-2">Transcript</p>
        {transcript.length === 0 ? (
          <p className="text-zinc-600 text-sm">Transcript will appear here...</p>
        ) : (
          transcript.map((line, i) => (
            <p
              key={i}
              className={`text-sm mb-1 ${
                line.startsWith("AI:") ? "text-blue-400" : "text-green-400"
              }`}
            >
              {line}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
