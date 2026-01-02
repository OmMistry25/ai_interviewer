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

  private options: Required<Omit<AudioCaptureOptions, 'existingStream' | 'audioContext'>> & { existingStream?: MediaStream; audioContext?: AudioContext };
  private isSilent = true;
  private silenceStartTime: number | null = null;
  private lastProgressUpdate = 0;
  private hasSpoken = false; // Track if user has spoken at all
  
  // New: Detection control and speech duration tracking
  private detectionEnabled = true; // When false, ignore all detection (AI is speaking)
  private speechStartTime: number | null = null; // When current speech segment started
  private cumulativeSpeechMs = 0; // Total speech time for this answer

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
  }

  isCapturing(): boolean {
    return this.audioContext !== null;
  }
}
