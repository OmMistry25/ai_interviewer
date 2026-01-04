"use client";

import { Volume2, Mic } from "lucide-react";

interface AIAvatarProps {
  state: "idle" | "speaking" | "listening" | "thinking";
  size?: "sm" | "md" | "lg";
}

export function AIAvatar({ state, size = "md" }: AIAvatarProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        rounded-2xl 
        bg-gradient-to-br from-slate-800/80 to-slate-900/80
        border border-slate-700/50
        flex items-center justify-center
        shadow-lg shadow-slate-950/50
        backdrop-blur-sm
        relative
        overflow-hidden
      `}
    >
      {/* Ambient glow based on state */}
      <div className={`
        absolute inset-0 opacity-30 transition-colors duration-500
        ${state === "speaking" 
          ? "bg-gradient-to-br from-amber-500/20 to-transparent" 
          : state === "listening" 
          ? "bg-gradient-to-br from-emerald-500/20 to-transparent"
          : state === "thinking"
          ? "bg-gradient-to-br from-purple-500/20 to-transparent"
          : "bg-transparent"
        }
      `} />

      {/* Avatar icon */}
      <div className="relative z-10">
        <div className={`
          w-12 h-12 rounded-xl 
          ${state === "speaking" 
            ? "bg-amber-500/20 text-amber-400" 
            : state === "listening" 
            ? "bg-emerald-500/20 text-emerald-400"
            : state === "thinking"
            ? "bg-purple-500/20 text-purple-400"
            : "bg-slate-700/50 text-slate-500"
          }
          flex items-center justify-center
          transition-colors duration-300
        `}>
          {state === "speaking" ? (
            <Volume2 className={`${iconSizes[size]} animate-pulse`} />
          ) : state === "listening" ? (
            <Mic className={iconSizes[size]} />
          ) : state === "thinking" ? (
            // Subtle thinking animation - 3 dots that pulse
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <Volume2 className={iconSizes[size]} />
          )}
        </div>

        {/* Pulse rings for speaking */}
        {state === "speaking" && (
          <>
            <div className="absolute inset-0 rounded-xl border border-amber-400/30 animate-ping" />
          </>
        )}
        
        {/* Subtle glow for thinking */}
        {state === "thinking" && (
          <div className="absolute inset-0 rounded-xl bg-purple-500/10 animate-pulse" />
        )}
      </div>

      {/* State label */}
      <span className={`
        absolute bottom-2 text-[10px] font-medium tracking-wide uppercase
        ${state === "speaking" 
          ? "text-amber-400" 
          : state === "listening"
          ? "text-emerald-400"
          : state === "thinking"
          ? "text-purple-400"
          : "text-slate-600"
        }
      `}>
        {state === "speaking" && "Speaking"}
        {state === "listening" && "Listening"}
        {state === "thinking" && "Thinking..."}
      </span>
    </div>
  );
}
