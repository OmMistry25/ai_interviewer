/**
 * Audio capture utilities for speech-to-text processing
 * Supports smart pause detection with visual feedback and interruption handling
 */

export interface AudioCaptureOptions {
  sampleRate?: number;
  onAudioData?: (pcmData: Float32Array) => void;
  /** Called when silence is first detected (after speaking) */
  onSilenceStart?: () => void;
  /** Called when user starts speaking after silence */
  onSpeechResume?: () => void;
  /** Called when pause threshold is reached and answer should be submitted */
  onPauseComplete?: () => void;
  /** Called with progress during the visual feedback period (3-5s) */
  onPauseProgress?: (progress: number) => void;
  /** Called when speech is detected (for interruption handling) */
  onSpeechDetected?: () => void;
  /** RMS threshold below which is considered silence */
  silenceThreshold?: number;
  /** Time before starting visual countdown (ms) - default 3000 */
  silenceDelayMs?: number;
  /** Total time of silence before submitting (ms) - default 5000 */
  silenceThresholdMs?: number;
  /** Existing MediaStream to use instead of requesting a new one */
  existingStream?: MediaStream;
}

export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private ownsStream = true; // Whether we created the stream and should stop it

  private options: Required<Omit<AudioCaptureOptions, 'existingStream'>> & { existingStream?: MediaStream };
  private isSilent = true;
  private silenceStartTime: number | null = null;
  private lastProgressUpdate = 0;
  private hasSpoken = false; // Track if user has spoken at all

  constructor(options: AudioCaptureOptions = {}) {
    this.options = {
      sampleRate: options.sampleRate ?? 16000,
      onAudioData: options.onAudioData ?? (() => {}),
      onSilenceStart: options.onSilenceStart ?? (() => {}),
      onSpeechResume: options.onSpeechResume ?? (() => {}),
      onPauseComplete: options.onPauseComplete ?? (() => {}),
      onPauseProgress: options.onPauseProgress ?? (() => {}),
      onSpeechDetected: options.onSpeechDetected ?? (() => {}),
      silenceThreshold: options.silenceThreshold ?? 0.015,
      silenceDelayMs: options.silenceDelayMs ?? 3000,
      silenceThresholdMs: options.silenceThresholdMs ?? 5000,
      existingStream: options.existingStream,
    };
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

      this.audioContext = new AudioContext({
        sampleRate: this.options.sampleRate,
      });

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

        // Check for silence/speech
        this.detectSilence(pcmData);
      };
    } catch (error) {
      console.error("Failed to start audio capture:", error);
      throw error;
    }
  }

  private detectSilence(pcmData: Float32Array): void {
    // Calculate RMS (root mean square) for volume level
    let sum = 0;
    for (let i = 0; i < pcmData.length; i++) {
      sum += pcmData[i] * pcmData[i];
    }
    const rms = Math.sqrt(sum / pcmData.length);

    const now = Date.now();
    const isSpeaking = rms >= this.options.silenceThreshold;

    if (isSpeaking) {
      // User is speaking
      this.options.onSpeechDetected();
      
      if (this.isSilent && this.hasSpoken) {
        // Was silent, now speaking again - resume
        this.options.onSpeechResume();
        this.options.onPauseProgress(0); // Reset progress
      }
      
      this.hasSpoken = true;
      this.isSilent = false;
      this.silenceStartTime = null;
      this.lastProgressUpdate = 0;
    } else {
      // User is silent
      if (!this.isSilent && this.hasSpoken) {
        // Just became silent after speaking
        this.silenceStartTime = now;
        this.options.onSilenceStart();
      }
      this.isSilent = true;

      // Calculate pause progress if we've been silent
      if (this.silenceStartTime && this.hasSpoken) {
        const silenceDuration = now - this.silenceStartTime;
        
        if (silenceDuration >= this.options.silenceThresholdMs) {
          // Pause threshold reached - submit answer
          this.options.onPauseComplete();
          this.silenceStartTime = null;
          this.hasSpoken = false;
        } else if (silenceDuration >= this.options.silenceDelayMs) {
          // In visual feedback period (3-5s)
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
   * Reset pause detection (use when AI starts speaking)
   */
  resetPauseDetection(): void {
    this.silenceStartTime = null;
    this.hasSpoken = false;
    this.isSilent = true;
    this.lastProgressUpdate = 0;
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
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    // Only stop the stream if we created it
    if (this.stream && this.ownsStream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.stream = null;
    this.resetPauseDetection();
  }

  isCapturing(): boolean {
    return this.audioContext !== null;
  }
}
