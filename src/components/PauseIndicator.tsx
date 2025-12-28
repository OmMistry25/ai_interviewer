"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";

interface PauseIndicatorProps {
  /** Whether pause detection is active */
  active: boolean;
  /** Progress from 0 to 1 (0 = just started detecting, 1 = about to submit) */
  progress: number;
  /** Number of dots to show */
  dots?: number;
}

export function PauseIndicator({ 
  active, 
  progress, 
  dots = 5 
}: PauseIndicatorProps) {
  // Calculate how many dots should be filled
  const filledDots = Math.floor(progress * dots);

  if (!active) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 bg-slate-800/60 px-3 py-2 rounded-full border border-slate-700/50">
      <span className="text-xs text-slate-500">Processing response</span>
      <div className="flex gap-1">
        {Array.from({ length: dots }).map((_, i) => (
          <div
            key={i}
            className={`
              w-1.5 h-1.5 rounded-full transition-all duration-200
              ${i < filledDots 
                ? "bg-amber-400 scale-125" 
                : "bg-slate-600"
              }
            `}
          />
        ))}
      </div>
      {progress >= 0.8 && (
        <span className="flex items-center gap-1 text-xs text-amber-400 animate-pulse">
          <Send className="w-3 h-3" />
          Sending
        </span>
      )}
    </div>
  );
}

/**
 * Hook to manage pause detection progress
 */
export function usePauseProgress(
  isDetecting: boolean,
  thresholdMs: number = 5000,
  delayMs: number = 3000
) {
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (!isDetecting) {
      setProgress(0);
      setStartTime(null);
      return;
    }

    if (startTime === null) {
      setStartTime(Date.now());
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - (startTime || Date.now());
      const effectiveElapsed = Math.max(0, elapsed - delayMs);
      const duration = thresholdMs - delayMs;
      const newProgress = Math.min(1, effectiveElapsed / duration);
      setProgress(newProgress);
    }, 100);

    return () => clearInterval(interval);
  }, [isDetecting, startTime, thresholdMs, delayMs]);

  return progress;
}
