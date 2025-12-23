/**
 * Client-side helper to request TTS and play audio
 */

export async function speakText(
  text: string,
  options?: {
    interviewId?: string;
    questionId?: string;
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<void> {
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

  return new Promise((resolve, reject) => {
    audio.onplay = () => options?.onStart?.();
    audio.onended = () => {
      options?.onEnd?.();
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      reject(e);
    };
    audio.play();
  });
}

