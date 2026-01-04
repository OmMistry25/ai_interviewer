/**
 * Pre-cached conversational filler audio for instant playback
 * These short acknowledgments play immediately when pause is detected,
 * making the AI feel responsive while processing happens in the background
 */

// Filler phrases - warm, enthusiastic acknowledgments
const FILLER_PHRASES = [
  "That's great!",
  "Interesting!",
  "I really appreciate that.",
  "That's helpful, thank you.",
  "Okay, great!",
  "Got it, thanks!",
  "That makes sense!",
  "Wonderful!",
];

// Cache for generated filler audio (base64)
const fillerCache: Map<string, string> = new Map();
let cacheInitialized = false;
let initPromise: Promise<void> | null = null;

// Shared AudioContext for playback
let fillerAudioContext: AudioContext | null = null;

/**
 * Set the AudioContext for filler playback (call with same context as TTS)
 */
export function setFillerAudioContext(ctx: AudioContext): void {
  fillerAudioContext = ctx;
}

/**
 * Initialize filler cache by generating audio clips
 * Call this early (e.g., when interview starts) to pre-warm the cache
 */
export async function initializeFillers(): Promise<void> {
  if (cacheInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Generate all fillers in parallel
      const results = await Promise.all(
        FILLER_PHRASES.map(async (phrase) => {
          try {
            const response = await fetch("/api/speech/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: phrase,
                stream: false,
                voice: "alloy", // Use a consistent voice
                speed: 0.92, // Natural, relaxed pace - not rushed
              }),
            });

            if (!response.ok) {
              console.warn(`Failed to generate filler for "${phrase}"`);
              return null;
            }

            const blob = await response.blob();
            const base64 = await blobToBase64(blob);
            return { phrase, base64 };
          } catch (e) {
            console.warn(`Error generating filler for "${phrase}":`, e);
            return null;
          }
        })
      );

      // Store successful results in cache
      for (const result of results) {
        if (result) {
          fillerCache.set(result.phrase, result.base64);
        }
      }

      cacheInitialized = true;
      console.log(`Initialized ${fillerCache.size} filler audio clips`);
    } catch (e) {
      console.error("Failed to initialize fillers:", e);
    }
  })();

  return initPromise;
}

/**
 * Play a random filler audio clip
 * Returns immediately if no fillers are cached
 */
export async function playRandomFiller(): Promise<void> {
  // Don't block if cache isn't ready
  if (fillerCache.size === 0) {
    console.log("No fillers cached, skipping");
    return;
  }

  // Pick a random filler
  const phrases = Array.from(fillerCache.keys());
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  const base64Audio = fillerCache.get(randomPhrase);

  if (!base64Audio) return;

  try {
    await playBase64Audio(base64Audio);
  } catch (e) {
    console.warn("Failed to play filler:", e);
  }
}

/**
 * Play a specific filler if cached
 */
export async function playFiller(phrase: string): Promise<void> {
  const base64Audio = fillerCache.get(phrase);
  if (!base64Audio) {
    console.warn(`Filler "${phrase}" not cached`);
    return;
  }

  try {
    await playBase64Audio(base64Audio);
  } catch (e) {
    console.warn("Failed to play filler:", e);
  }
}

/**
 * Check if fillers are ready
 */
export function areFillersReady(): boolean {
  return cacheInitialized && fillerCache.size > 0;
}

// Helper: Convert Blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper: Play base64 audio using Web Audio API
async function playBase64Audio(base64: string): Promise<void> {
  // Decode base64 to ArrayBuffer
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const arrayBuffer = bytes.buffer;

  // Use shared AudioContext or create a temporary one
  const ctx = fillerAudioContext || new AudioContext();
  
  // Resume if suspended
  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    return new Promise((resolve) => {
      source.onended = () => resolve();
      source.start(0);
    });
  } catch (e) {
    // Fallback to HTML Audio
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    return new Promise((resolve, reject) => {
      audio.onended = () => resolve();
      audio.onerror = reject;
      audio.play().catch(reject);
    });
  }
}

