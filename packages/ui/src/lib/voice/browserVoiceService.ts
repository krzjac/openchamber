/**
 * Browser Voice Service - Audio recording and transcription
 *
 * Records audio using MediaRecorder API and sends to server for transcription.
 * Provides speech synthesis (TTS) using browser-native Web Speech API.
 *
 * @example
 * ```typescript
 * import { browserVoiceService } from './browserVoiceService';
 *
 * // Check support
 * if (browserVoiceService.isSupported()) {
 *   // Start recording
 *   browserVoiceService.startRecording('en-US', (text) => {
 *     console.log('Transcribed:', text);
 *   });
 *
 *   // Stop recording (triggers transcription)
 *   browserVoiceService.stopRecording();
 *
 *   // Speak text
 *   browserVoiceService.speakText('Hello world', 'en-US', () => {
 *     console.log('Speech finished');
 *   });
 * }
 * ```
 */

export type TranscriptionCallback = (text: string) => void;
export type SpeechEndCallback = () => void;
export type ErrorCallback = (error: string) => void;

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}

class BrowserVoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private isRecording = false;
  private currentLang = 'en-US';
  private onTranscriptionCallback: TranscriptionCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;
  private conversationMode = false;
  private isSpeaking = false;
  private audioContext: AudioContext | null = null;
  private audioUnlockRequired = false;
  private apiKey: string | null = null;

  isSupported(): boolean {
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    const hasSynthesis = 'speechSynthesis' in window;
    return hasMediaRecorder && hasSynthesis;
  }

  getSupportDetails(): {
    recording: boolean;
    synthesis: boolean;
    secureContext: boolean;
  } {
    return {
      recording: typeof MediaRecorder !== 'undefined',
      synthesis: 'speechSynthesis' in window,
      secureContext: window.isSecureContext,
    };
  }

  setConversationMode(enabled: boolean): void {
    this.conversationMode = enabled;
  }

  isConversationMode(): boolean {
    return this.conversationMode;
  }

  setApiKey(apiKey: string | null): void {
    this.apiKey = apiKey;
  }

  async checkMicrophonePermission(): Promise<boolean> {
    try {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state === 'granted';
      }
      return false;
    } catch {
      return false;
    }
  }

  async prepareListening(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('MediaRecorder not supported in this browser');
    }

    if (typeof navigator === 'undefined' || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      throw new Error('MediaDevices not available');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (err) {
      const name = typeof err === 'object' && err && 'name' in err ? String((err as { name?: unknown }).name) : '';
      if (name === 'NotAllowedError') {
        throw new Error('Microphone permission denied');
      }
      if (name === 'NotFoundError') {
        throw new Error('No microphone found');
      }
      const errorMsg = err instanceof Error ? err.message : 'Unable to access microphone';
      throw new Error(errorMsg);
    }
  }

  getSupportedMimeType(): string | null {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return null;
  }

  getFileExtension(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'mp4';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('wav')) return 'wav';
    return 'webm';
  }

  async startRecording(
    lang: string,
    onTranscription: TranscriptionCallback,
    onError?: ErrorCallback
  ): Promise<void> {
    if (!this.isSupported()) {
      const errorMsg = 'MediaRecorder not supported in this browser';
      onError?.(errorMsg);
      throw new Error(errorMsg);
    }

    if (this.isRecording) {
      console.log('[BrowserVoiceService] Already recording, stopping first');
      this.stopRecording();
    }

    this.currentLang = lang;
    this.onTranscriptionCallback = onTranscription;
    this.onErrorCallback = onError || null;
    this.audioChunks = [];

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = this.getSupportedMimeType();
      if (!mimeType) {
        throw new Error('No supported audio format found');
      }

      console.log('[BrowserVoiceService] Using MIME type:', mimeType);

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[BrowserVoiceService] MediaRecorder error:', event);
        const errorMsg = 'Recording error occurred';
        this.onErrorCallback?.(errorMsg);
        this.isRecording = false;
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;
      console.log('[BrowserVoiceService] Recording started');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start recording';
      this.onErrorCallback?.(errorMsg);
      throw new Error(errorMsg);
    }
  }

  async stopRecording(): Promise<string | null> {
    if (!this.mediaRecorder || !this.isRecording) {
      console.log('[BrowserVoiceService] Not recording, nothing to stop');
      return null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        this.isRecording = false;

        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;
        }

        if (this.audioChunks.length === 0) {
          console.log('[BrowserVoiceService] No audio recorded');
          resolve(null);
          return;
        }

        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const extension = this.getFileExtension(mimeType);
        const filename = `recording.${extension}`;

        console.log('[BrowserVoiceService] Audio recorded:', audioBlob.size, 'bytes, type:', mimeType);

        try {
          const text = await this.sendForTranscription(audioBlob, filename);
          this.audioChunks = [];
          this.mediaRecorder = null;
          resolve(text);
        } catch (err) {
          console.error('[BrowserVoiceService] Transcription error:', err);
          const errorMsg = err instanceof Error ? err.message : 'Transcription failed';
          this.onErrorCallback?.(errorMsg);
          this.audioChunks = [];
          this.mediaRecorder = null;
          resolve(null);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  async sendForTranscription(audioBlob: Blob, filename: string): Promise<string> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    console.log('[BrowserVoiceService] Sending for transcription, audio size:', audioBlob.size, 'hasApiKey:', !!this.apiKey);

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioData: base64Audio,
        mimeType: audioBlob.type || 'audio/webm',
        apiKey: this.apiKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Transcription failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('[BrowserVoiceService] Transcription result:', result);

    if (result.text && this.onTranscriptionCallback) {
      this.onTranscriptionCallback(result.text);
    }

    return result.text || '';
  }

  pauseListening(): void {
    if (this.isRecording) {
      this.stopRecording().catch((err) => {
        console.error('[BrowserVoiceService] Error stopping recording:', err);
      });
    }
  }

  async resumeListening(): Promise<void> {
    if (this.conversationMode && this.onTranscriptionCallback && !this.isSpeaking) {
      try {
        await this.startRecording(this.currentLang, this.onTranscriptionCallback, this.onErrorCallback || undefined);
      } catch (err) {
        console.error('[BrowserVoiceService] Failed to resume recording:', err);
      }
    }
  }

  stopListening(): void {
    if (this.isRecording) {
      this.stopRecording().catch((err) => {
        console.error('[BrowserVoiceService] Error stopping recording:', err);
      });
    }
    this.onTranscriptionCallback = null;
    this.onErrorCallback = null;
  }

  getIsListening(): boolean {
    return this.isRecording;
  }

  getCurrentLang(): string {
    return this.currentLang;
  }

  async resumeAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  isAudioUnlockRequired(): boolean {
    return this.audioUnlockRequired;
  }

  async unlockAudio(): Promise<boolean> {
    try {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      audio.volume = 0.01;
      await audio.play();

      await this.resumeAudioContext();

      if (this.isMobileDevice() && 'speechSynthesis' in window) {
        const unlockUtterance = new SpeechSynthesisUtterance('');
        unlockUtterance.volume = 0;
        window.speechSynthesis.speak(unlockUtterance);
        window.speechSynthesis.cancel();
      }

      this.audioUnlockRequired = false;
      return true;
    } catch (err) {
      console.error('[BrowserVoiceService] Failed to unlock audio:', err);
      return false;
    }
  }

  async speakText(
    text: string,
    lang: string,
    onEnd?: SpeechEndCallback,
    options?: { rate?: number; pitch?: number; volume?: number; voiceName?: string }
  ): Promise<void> {
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not supported');
    }

    await this.resumeAudioContext();

    const voices = await this.waitForVoices();

    await new Promise(resolve => setTimeout(resolve, 50));

    this.isSpeaking = true;
    this.pauseListening();

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;

    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (options?.voiceName) {
      selectedVoice = voices.find(v => v.name === options.voiceName) || null;
    }

    if (!selectedVoice) {
      selectedVoice = this.findBestVoice(voices, lang);
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    console.log(`[BrowserVoiceService] Speaking text (${text.length} chars) in ${lang}`);

    return new Promise((resolve, reject) => {
      let hasStarted = false;

      utterance.onstart = () => {
        hasStarted = true;
        console.log('[BrowserVoiceService] Speech started');
        resolve();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        console.log('[BrowserVoiceService] Speech ended');
        onEnd?.();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        console.error('[BrowserVoiceService] Speech synthesis error:', event.error);

        if (event.error === 'not-allowed' || event.error === 'interrupted') {
          this.audioUnlockRequired = true;
        }

        let errorMessage = `Speech synthesis error: ${event.error || 'unknown'}`;
        if (event.error === 'not-allowed') {
          errorMessage = 'Audio blocked by browser autoplay policy. Please interact with the page first.';
        } else if (event.error === 'interrupted') {
          errorMessage = 'Speech was interrupted. Please try again.';
        }

        reject(new Error(errorMessage));
      };

      setTimeout(() => {
        if (!hasStarted) {
          console.warn('[BrowserVoiceService] Speech start timeout - audio may be blocked');
          this.audioUnlockRequired = true;
        }
      }, 2000);

      window.speechSynthesis.speak(utterance);
    });
  }

  cancelSpeech(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) {
      return [];
    }
    return window.speechSynthesis.getVoices();
  }

  async waitForVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!('speechSynthesis' in window)) {
      return [];
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      return voices;
    }

    return new Promise((resolve) => {
      const handleVoicesChanged = () => {
        resolve(window.speechSynthesis.getVoices());
        window.speechSynthesis.onvoiceschanged = null;
      };

      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;

      setTimeout(() => {
        resolve(window.speechSynthesis.getVoices());
        window.speechSynthesis.onvoiceschanged = null;
      }, 1000);
    });
  }

  private findBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
    let voice = voices.find(v => v.lang === lang);

    if (!voice) {
      const langCode = lang.split('-')[0];
      voice = voices.find(v => v.lang.startsWith(langCode));
    }

    if (!voice) {
      voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]) && v.localService);
    }

    return voice || null;
  }

  private isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod|android|mobile|webos|blackberry|iemobile|opera mini/i.test(userAgent);
  }
}

export const browserVoiceService = new BrowserVoiceService();
export { BrowserVoiceService };
