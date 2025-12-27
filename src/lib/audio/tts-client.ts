/**
 * Client-side helper to request TTS and play audio with streaming support
 * Supports interruption handling for natural conversation flow
 */

let currentAudio: HTMLAudioElement | null = null;
let currentResolve: (() => void) | null = null;
let abortController: AbortController | null = null;

/**
 * Stop any currently playing TTS audio
 */
export function stopSpeaking(): void {
  // Abort any in-progress fetch
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    // Revoke any object URLs
    if (currentAudio.src.startsWith("blob:")) {
      URL.revokeObjectURL(currentAudio.src);
    }
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

/**
 * Speak text with streaming - starts playing as data arrives
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
  // Stop any currently playing audio first
  stopSpeaking();

  // Create abort controller for this request
  abortController = new AbortController();

  let response: Response;
  try {
    response = await fetch("/api/speech/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        interviewId: options?.interviewId,
        questionId: options?.questionId,
        stream: true,
      }),
      signal: abortController.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return; // Intentionally aborted
    }
    console.error("TTS fetch error:", e);
    throw new Error("Network error - please check your connection");
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.error("TTS API error:", response.status, errorText);
    throw new Error(`Speech generation failed (${response.status})`);
  }

  // Stream the audio - collect chunks and play
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const chunks: ArrayBuffer[] = [];
  let totalLength = 0;

  try {
    // Collect all chunks first
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Convert Uint8Array to ArrayBuffer for Blob compatibility
      chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
      totalLength += value.length;
    }

    // Create blob and play audio
    const audioBlob = new Blob(chunks, { type: "audio/mpeg" });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    
    options?.onStart?.();

    return new Promise((resolve, reject) => {
      currentResolve = resolve;
      
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
      
      audio.play().catch(reject);
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return; // Intentionally aborted
    }
    throw e;
  }
}

/**
 * Simple non-streaming fallback for compatibility
 */
export async function speakTextSimple(
  text: string,
  options?: {
    interviewId?: string;
    questionId?: string;
  }
): Promise<void> {
  stopSpeaking();

  const response = await fetch("/api/speech/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      interviewId: options?.interviewId,
      questionId: options?.questionId,
      stream: false,
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
    
    audio.onended = () => {
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
