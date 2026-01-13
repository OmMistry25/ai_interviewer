/**
 * Audio buffer for collecting PCM chunks and converting to formats suitable for STT APIs
 */

export class AudioBuffer {
  private chunks: Float32Array[] = [];
  private sampleRate: number;

  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
  }

  addChunk(pcmData: Float32Array): void {
    this.chunks.push(new Float32Array(pcmData));
  }

  clear(): void {
    this.chunks = [];
  }

  isEmpty(): boolean {
    return this.chunks.length === 0;
  }

  getDurationMs(): number {
    const totalSamples = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    return (totalSamples / this.sampleRate) * 1000;
  }

  /**
   * Get all audio as a single Float32Array
   */
  getFloat32Array(): Float32Array {
    const totalLength = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  /**
   * Convert to 16-bit PCM WAV format (commonly used by STT APIs)
   */
  toWavBlob(): Blob {
    const float32Data = this.getFloat32Array();
    const int16Data = this.float32ToInt16(float32Data);
    const wavData = this.encodeWav(int16Data, this.sampleRate);
    return new Blob([wavData], { type: "audio/wav" });
  }

  /**
   * Convert to base64-encoded WAV
   */
  async toBase64Wav(): Promise<string> {
    const blob = this.toWavBlob();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  private encodeWav(samples: Int16Array, sampleRate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV header
    this.writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, "WAVE");
    this.writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    this.writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    // Write samples
    const offset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset + i * 2, samples[i], true);
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
}


