"use client";

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

  const pulseAnimation = state === "speaking" 
    ? "animate-pulse" 
    : state === "listening"
    ? "animate-[pulse_2s_ease-in-out_infinite]"
    : "";

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        rounded-xl 
        bg-gradient-to-br from-zinc-800 to-zinc-900
        border border-zinc-700
        flex items-center justify-center
        shadow-lg
        ${pulseAnimation}
      `}
    >
      {/* Avatar icon */}
      <div className="relative">
        {/* Main icon */}
        <div className={`
          w-12 h-12 rounded-full 
          ${state === "speaking" 
            ? "bg-blue-500" 
            : state === "listening" 
            ? "bg-emerald-500"
            : state === "thinking"
            ? "bg-amber-500"
            : "bg-zinc-600"
          }
          flex items-center justify-center
          transition-colors duration-300
        `}>
          <svg 
            className="w-6 h-6 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {state === "speaking" ? (
              // Sound waves icon
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828" 
              />
            ) : state === "listening" ? (
              // Microphone icon
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            ) : state === "thinking" ? (
              // Thinking dots
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01" 
              />
            ) : (
              // Default user icon
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            )}
          </svg>
        </div>

        {/* Speaking animation rings */}
        {state === "speaking" && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full border border-blue-300 animate-pulse opacity-40" />
          </>
        )}
      </div>

      {/* State label */}
      <span className={`
        absolute bottom-1 text-[10px] font-medium
        ${state === "speaking" 
          ? "text-blue-400" 
          : state === "listening"
          ? "text-emerald-400"
          : state === "thinking"
          ? "text-amber-400"
          : "text-zinc-500"
        }
      `}>
        {state === "speaking" && "Speaking"}
        {state === "listening" && "Listening"}
        {state === "thinking" && "Thinking"}
      </span>
    </div>
  );
}

