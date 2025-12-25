/**
 * Client-side helper to request TTS and play audio
 * Supports interruption handling for natural conversation flow
 */

let currentAudio: HTMLAudioElement | null = null;
let currentResolve: (() => void) | null = null;

/**
 * Stop any currently playing TTS audio
 */
export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (currentResolve) {
    currentResolve();
    currentResolve = null;
  }
}

/**
 * Check if TTS is currently speaking
 */
export function isSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

export async function speakText(
  text: string,
  options?: {
    interviewId?: string;
    questionId?: string;
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<void> {
  // Stop any currently playing audio first
  stopSpeaking();

  const response = await fetch("/api/speech/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      interviewId: options?.interviewId,
      questionId: options?.questionId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate speech");
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  currentAudio = audio;

  return new Promise((resolve, reject) => {
    currentResolve = resolve;
    
    audio.onplay = () => options?.onStart?.();
    audio.onended = () => {
      options?.onEnd?.();
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      currentResolve = null;
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      currentResolve = null;
      reject(e);
    };
    audio.play();
  });
}
