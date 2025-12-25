"use client";

import { useEffect, useRef } from "react";

interface TranscriptMessage {
  speaker: "interviewer" | "candidate";
  text: string;
  timestamp?: Date;
}

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
}

export function TranscriptPanel({ messages }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-full flex flex-col bg-zinc-900 rounded-lg border border-zinc-800">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300">Transcript</h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <p className="text-zinc-600 text-sm italic">
            Conversation will appear here...
          </p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="space-y-1">
              <p className={`text-xs font-medium ${
                msg.speaker === "interviewer" 
                  ? "text-blue-400" 
                  : "text-emerald-400"
              }`}>
                {msg.speaker === "interviewer" ? "Interviewer" : "You"}
              </p>
              <p className={`text-sm leading-relaxed ${
                msg.speaker === "interviewer"
                  ? "text-zinc-300"
                  : "text-zinc-400"
              }`}>
                {msg.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export type { TranscriptMessage };

