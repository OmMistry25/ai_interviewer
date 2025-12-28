"use client";

import { useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";

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
    <div className="h-full flex flex-col bg-slate-900/80 rounded-xl border border-slate-800/80 backdrop-blur-sm">
      <div className="px-4 py-3 border-b border-slate-800/80 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-300">Transcript</h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <p className="text-slate-600 text-sm italic">
            Conversation will appear here...
          </p>
        ) : (
          messages.map((msg, i) => (
            <div 
              key={i} 
              className={`space-y-1 ${
                msg.speaker === "interviewer" 
                  ? "" 
                  : "pl-3 border-l-2 border-amber-500/30"
              }`}
            >
              <p className={`text-xs font-medium ${
                msg.speaker === "interviewer" 
                  ? "text-slate-500" 
                  : "text-amber-500"
              }`}>
                {msg.speaker === "interviewer" ? "Interviewer" : "You"}
              </p>
              <p className={`text-sm leading-relaxed ${
                msg.speaker === "interviewer"
                  ? "text-slate-300"
                  : "text-slate-400"
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
