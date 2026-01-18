/**
 * Audio capture utilities for speech-to-text processing
 * Supports smart pause detection with visual feedback and interruption handling
 */

// Buffer chunk with timestamp for rolling buffer
interface AudioChunk {
  data: Float32Array;
  timestamp: number;
}

export interface AudioCaptureOptions {
  sampleRate?: number;
  onAudioData?: (pcmData: Float32Array) => void;
  /** Enable audio buffering for clip extraction (default: false) */
  enableBuffer?: boolean;
  /** Buffer duration in milliseconds (default: 120000 = 120 seconds) */
  bufferDurationMs?: number;
  /** Called when silence is first detected (after speaking) */
  onSilenceStart?: () => void;
  /** Called when user starts speaking after silence */
  onSpeechResume?: () => void;
  /** Called when pause threshold is reached and answer should be submitted */
  onPauseComplete?: () => void;
  /** Called with progress during the visual feedback period */
  onPauseProgress?: (progress: number) => void;
  /** Called when speech is detected (for interruption handling) */
  onSpeechDetected?: () => void;
  /** RMS threshold below which is considered silence */
  silenceThreshold?: number;
  /** Time before starting visual countdown (ms) - default 1500 */
  silenceDelayMs?: number;
  /** Total time of silence before submitting (ms) - default 3500 */
  silenceThresholdMs?: number;
  /** Minimum speech duration (ms) before pause detection activates - default 500 */
  minSpeechDurationMs?: number;
  /** Existing MediaStream to use instead of requesting a new one */
  existingStream?: MediaStream;
  /** Pre-created AudioContext (required for iOS Safari - must be created from user gesture) */
  audioContext?: AudioContext;
}

export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private ownsStream = true; // Whether we created the stream and should stop it
  private ownsContext = true; // Whether we created the AudioContext and should close it

  private options: Required<Omit<AudioCaptureOptions, 'existingStream' | 'audioContext' | 'enableBuffer' | 'bufferDurationMs'>> & { existingStream?: MediaStream; audioContext?: AudioContext };
  private isSilent = true;
  private silenceStartTime: number | null = null;
  private lastProgressUpdate = 0;
  private hasSpoken = false; // Track if user has spoken at all
  
  // New: Detection control and speech duration tracking
  private detectionEnabled = true; // When false, ignore all detection (AI is speaking)
  private speechStartTime: number | null = null; // When current speech segment started
  private cumulativeSpeechMs = 0; // Total speech time for this answer

  // Audio buffer for clip extraction (Phase 5)
  private audioBuffer: AudioChunk[] = [];
  private bufferEnabled = false;
  private bufferDurationMs = 120000; // 120 seconds default
  private interviewStartTime: number | null = null; // Track when interview started for clip timestamps

  constructor(options: AudioCaptureOptions = {}) {
    this.options = {
      sampleRate: options.sampleRate ?? 16000,
      onAudioData: options.onAudioData ?? (() => {}),
      onSilenceStart: options.onSilenceStart ?? (() => {}),
      onSpeechResume: options.onSpeechResume ?? (() => {}),
      onPauseComplete: options.onPauseComplete ?? (() => {}),
      onPauseProgress: options.onPauseProgress ?? (() => {}),
      onSpeechDetected: options.onSpeechDetected ?? (() => {}),
      silenceThreshold: options.silenceThreshold ?? 0.02, // Raised from 0.015
      silenceDelayMs: options.silenceDelayMs ?? 1500, // Reduced from 3000
      silenceThresholdMs: options.silenceThresholdMs ?? 3500, // Reduced from 5000
      minSpeechDurationMs: options.minSpeechDurationMs ?? 500, // New: minimum speech before pause detection
      existingStream: options.existingStream,
      audioContext: options.audioContext,
    };
    
    // Initialize buffer settings
    this.bufferEnabled = options.enableBuffer ?? false;
    this.bufferDurationMs = options.bufferDurationMs ?? 120000;
  }

  async start(): Promise<void> {
    try {
      // Use existing stream if provided, otherwise request a new one
      if (this.options.existingStream) {
        this.stream = this.options.existingStream;
        this.ownsStream = false;
      } else {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: this.options.sampleRate,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        this.ownsStream = true;
      }

      // Use provided AudioContext or create a new one
      // Note: For iOS Safari, AudioContext must be created from a user gesture
      if (this.options.audioContext) {
        this.audioContext = this.options.audioContext;
        this.ownsContext = false;
      } else {
        this.audioContext = new AudioContext({
          sampleRate: this.options.sampleRate,
        });
        this.ownsContext = true;
      }

      // Resume AudioContext if suspended (required for iOS Safari)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      // ScriptProcessor for raw audio data
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.source.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = new Float32Array(inputData);

        // Send audio data
        this.options.onAudioData(pcmData);

        // Add to buffer if enabled
        if (this.bufferEnabled) {
          this.addToBuffer(pcmData);
        }

        // Check for silence/speech
        this.detectSilence(pcmData);
      };
    } catch (error) {
      console.error("Failed to start audio capture:", error);
      throw error;
    }
  }

  private detectSilence(pcmData: Float32Array): void {
    // Skip all detection if disabled (AI is speaking)
    if (!this.detectionEnabled) {
      return;
    }

    // Calculate RMS (root mean square) for volume level
    let sum = 0;
    for (let i = 0; i < pcmData.length; i++) {
      sum += pcmData[i] * pcmData[i];
    }
    const rms = Math.sqrt(sum / pcmData.length);

    const now = Date.now();
    const isSpeaking = rms >= this.options.silenceThreshold;

    if (isSpeaking) {
      // User is speaking - notify for potential interruption
      this.options.onSpeechDetected();
      
      // Track speech duration
      if (this.speechStartTime === null) {
        this.speechStartTime = now;
      }
      
      // Update cumulative speech time
      const currentSpeechDuration = now - this.speechStartTime;
      
      if (this.isSilent && this.hasSpoken) {
        // Was silent, now speaking again - resume
        this.options.onSpeechResume();
        this.options.onPauseProgress(0); // Reset progress
      }
      
      // Only mark as "really spoken" after minimum speech duration
      if (this.cumulativeSpeechMs + currentSpeechDuration >= this.options.minSpeechDurationMs) {
        this.hasSpoken = true;
      }
      
      this.isSilent = false;
      this.silenceStartTime = null;
      this.lastProgressUpdate = 0;
    } else {
      // User is silent
      
      // If we were speaking, add that duration to cumulative
      if (!this.isSilent && this.speechStartTime !== null) {
        this.cumulativeSpeechMs += now - this.speechStartTime;
        this.speechStartTime = null;
      }
      
      if (!this.isSilent && this.hasSpoken) {
        // Just became silent after sufficient speaking
        this.silenceStartTime = now;
        this.options.onSilenceStart();
      }
      this.isSilent = true;

      // Calculate pause progress if we've been silent AND have really spoken
      if (this.silenceStartTime && this.hasSpoken) {
        const silenceDuration = now - this.silenceStartTime;
        
        if (silenceDuration >= this.options.silenceThresholdMs) {
          // Pause threshold reached - submit answer
          this.options.onPauseComplete();
          this.silenceStartTime = null;
          this.hasSpoken = false;
          this.cumulativeSpeechMs = 0;
        } else if (silenceDuration >= this.options.silenceDelayMs) {
          // In visual feedback period
          const progressDuration = this.options.silenceThresholdMs - this.options.silenceDelayMs;
          const progressTime = silenceDuration - this.options.silenceDelayMs;
          const progress = Math.min(1, progressTime / progressDuration);
          
          // Throttle progress updates to every 100ms
          if (now - this.lastProgressUpdate > 100) {
            this.options.onPauseProgress(progress);
            this.lastProgressUpdate = now;
          }
        }
      }
    }
  }

  /**
   * Check if speech is currently being detected
   */
  isSpeechDetected(): boolean {
    return !this.isSilent;
  }

  /**
   * Disable all detection (use when AI starts speaking a question)
   * Prevents background noise from triggering interruption
   */
  disableDetection(): void {
    this.detectionEnabled = false;
    this.resetPauseDetection();
  }

  /**
   * Enable detection (use when AI finishes speaking)
   * Starts listening for candidate's answer
   */
  enableDetection(): void {
    this.detectionEnabled = true;
    this.resetPauseDetection();
  }

  /**
   * Check if detection is currently enabled
   */
  isDetectionEnabled(): boolean {
    return this.detectionEnabled;
  }

  /**
   * Reset pause detection state for next answer
   */
  resetPauseDetection(): void {
    this.silenceStartTime = null;
    this.hasSpoken = false;
    this.isSilent = true;
    this.lastProgressUpdate = 0;
    this.speechStartTime = null;
    this.cumulativeSpeechMs = 0;
    this.options.onPauseProgress(0);
  }

  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    // Only close the AudioContext if we created it
    if (this.audioContext && this.ownsContext) {
      this.audioContext.close();
    }
    this.audioContext = null;
    // Only stop the stream if we created it
    if (this.stream && this.ownsStream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.stream = null;
    this.resetPauseDetection();
    this.clearBuffer();
  }

  isCapturing(): boolean {
    return this.audioContext !== null;
  }

  // ============================================================
  // AUDIO BUFFER METHODS (for clip extraction)
  // ============================================================

  /**
   * Add audio chunk to the rolling buffer
   * Automatically removes old chunks beyond bufferDurationMs
   */
  private addToBuffer(pcmData: Float32Array): void {
    const now = Date.now();
    
    // Set interview start time on first chunk
    if (this.interviewStartTime === null) {
      this.interviewStartTime = now;
    }

    // Add new chunk with copy of data (original may be reused)
    this.audioBuffer.push({
      data: new Float32Array(pcmData),
      timestamp: now,
    });

    // Remove old chunks beyond buffer duration
    const cutoffTime = now - this.bufferDurationMs;
    while (this.audioBuffer.length > 0 && this.audioBuffer[0].timestamp < cutoffTime) {
      this.audioBuffer.shift();
    }
  }

  /**
   * Enable or disable audio buffering
   */
  setBufferEnabled(enabled: boolean): void {
    this.bufferEnabled = enabled;
    if (!enabled) {
      this.clearBuffer();
    }
  }

  /**
   * Check if buffering is enabled
   */
  isBufferEnabled(): boolean {
    return this.bufferEnabled;
  }

  /**
   * Clear the audio buffer
   */
  clearBuffer(): void {
    this.audioBuffer = [];
  }

  /**
   * Get the current buffer size in milliseconds
   */
  getBufferDurationMs(): number {
    if (this.audioBuffer.length < 2) return 0;
    const first = this.audioBuffer[0].timestamp;
    const last = this.audioBuffer[this.audioBuffer.length - 1].timestamp;
    return last - first;
  }

  /**
   * Get recent audio from the buffer
   * @param durationMs How many milliseconds of audio to get (from the end)
   * @returns Float32Array of combined audio samples, or null if buffer empty
   */
  getRecentAudio(durationMs: number): Float32Array | null {
    if (this.audioBuffer.length === 0) {
      return null;
    }

    const now = Date.now();
    const cutoffTime = now - durationMs;

    // Filter chunks within the requested duration
    const relevantChunks = this.audioBuffer.filter(
      chunk => chunk.timestamp >= cutoffTime
    );

    if (relevantChunks.length === 0) {
      return null;
    }

    // Calculate total length
    const totalLength = relevantChunks.reduce(
      (sum, chunk) => sum + chunk.data.length, 
      0
    );

    // Combine all chunks
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of relevantChunks) {
      combined.set(chunk.data, offset);
      offset += chunk.data.length;
    }

    return combined;
  }

  /**
   * Export audio as a WAV Blob for upload
   * @param durationMs Duration of audio to export (from end of buffer)
   * @returns WAV Blob ready for upload, or null if no audio
   */
  exportAsWav(durationMs: number): Blob | null {
    const audio = this.getRecentAudio(durationMs);
    if (!audio) {
      return null;
    }

    return this.encodeWav(audio, this.options.sampleRate);
  }

  /**
   * Encode Float32Array PCM data as WAV
   */
  private encodeWav(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, 1, true); // NumChannels (mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Get time elapsed since interview started (for clip timestamps)
   */
  getElapsedTimeMs(): number {
    if (this.interviewStartTime === null) {
      return 0;
    }
    return Date.now() - this.interviewStartTime;
  }

  /**
   * Mark the start of a new interview (resets timing)
   */
  markInterviewStart(): void {
    this.interviewStartTime = Date.now();
    this.clearBuffer();
  }
}
