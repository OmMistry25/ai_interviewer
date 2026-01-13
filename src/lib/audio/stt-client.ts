/**
 * Client-side helper to send audio to STT API
 */

export async function transcribeAudio(
  audioBlob: Blob,
  interviewId?: string
): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");
  if (interviewId) {
    formData.append("interviewId", interviewId);
  }

  const response = await fetch("/api/speech/stt", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to transcribe");
  }

  const data = await response.json();
  return data.transcript;
}


