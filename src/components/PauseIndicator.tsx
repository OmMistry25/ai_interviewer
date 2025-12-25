"use client";

import { useEffect, useState } from "react";

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
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Detecting pause</span>
      <div className="flex gap-1">
        {Array.from({ length: dots }).map((_, i) => (
          <div
            key={i}
            className={`
              w-2 h-2 rounded-full transition-all duration-200
              ${i < filledDots 
                ? "bg-amber-400 scale-110" 
                : "bg-zinc-700"
              }
            `}
          />
        ))}
      </div>
      {progress >= 0.8 && (
        <span className="text-xs text-amber-400 animate-pulse">
          Submitting soon...
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

