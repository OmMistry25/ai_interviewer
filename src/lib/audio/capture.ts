/**
 * Audio capture utilities for speech-to-text processing
 */

export interface AudioCaptureOptions {
  sampleRate?: number;
  onAudioData?: (pcmData: Float32Array) => void;
  onSilenceStart?: () => void;
  onSilenceEnd?: () => void;
  silenceThreshold?: number;
  silenceDuration?: number; // ms of silence before triggering
}

export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  private options: Required<AudioCaptureOptions>;
  private isSilent = true;
  private silenceStartTime: number | null = null;

  constructor(options: AudioCaptureOptions = {}) {
    this.options = {
      sampleRate: options.sampleRate ?? 16000,
      onAudioData: options.onAudioData ?? (() => {}),
      onSilenceStart: options.onSilenceStart ?? (() => {}),
      onSilenceEnd: options.onSilenceEnd ?? (() => {}),
      silenceThreshold: options.silenceThreshold ?? 0.01,
      silenceDuration: options.silenceDuration ?? 1500,
    };
  }

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.audioContext = new AudioContext({
        sampleRate: this.options.sampleRate,
      });

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      // ScriptProcessor for raw audio data (deprecated but widely supported)
      // For production, consider AudioWorklet
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.source.connect(this.analyser);
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = new Float32Array(inputData);

        // Send audio data
        this.options.onAudioData(pcmData);

        // Check for silence
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
    const wasSilent = this.isSilent;

    if (rms < this.options.silenceThreshold) {
      // Currently silent
      if (!this.isSilent) {
        // Just became silent
        this.silenceStartTime = now;
      } else if (
        this.silenceStartTime &&
        now - this.silenceStartTime > this.options.silenceDuration
      ) {
        // Silence duration exceeded
        if (!wasSilent) {
          this.options.onSilenceStart();
        }
      }
      this.isSilent = true;
    } else {
      // Currently speaking
      if (this.isSilent) {
        this.options.onSilenceEnd();
      }
      this.isSilent = false;
      this.silenceStartTime = null;
    }
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
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  isCapturing(): boolean {
    return this.audioContext !== null;
  }
}

