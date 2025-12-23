"use client";

import { useState, useEffect } from "react";
import { VideoRoom } from "@/components/VideoRoom";

interface InterviewRoomProps {
  interviewToken: string;
}

interface RtcCredentials {
  token: string;
  roomName: string;
  participantName: string;
  interviewId: string;
}

export function InterviewRoom({ interviewToken }: InterviewRoomProps) {
  const [credentials, setCredentials] = useState<RtcCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const startInterview = async () => {
    try {
      const res = await fetch("/api/rtc/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get room credentials");
      }

      setCredentials(data);
      setStarted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start interview");
    }
  };

  if (error) {
    return (
      <div className="p-8 bg-zinc-800 rounded text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => setError(null)}
          className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="p-8 bg-zinc-800 rounded text-center">
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
    );
  }

  if (!credentials) {
    return (
      <div className="p-8 bg-zinc-800 rounded text-center text-zinc-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <VideoRoom
        token={credentials.token}
        roomName={credentials.roomName}
        onDisconnect={() => {
          // Interview ended intentionally
          window.location.reload();
        }}
      />
      <p className="text-zinc-500 text-sm text-center">
        Interview in progress...
      </p>
    </div>
  );
}

