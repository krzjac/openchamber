/**
 * Server-side Speech-to-Text Service
 *
 * Uses OpenAI's Whisper API to transcribe audio recordings.
 */

import OpenAI from 'openai';
import { readAuthFile } from './opencode/auth.js';

function getOpenAIApiKey() {
  const envKey = process.env.OPENAI_API_KEY;
  if (envKey) {
    return envKey;
  }

  try {
    const auth = readAuthFile();
    const openaiAuth = auth.openai || auth.codex || auth.chatgpt;
    if (openaiAuth) {
      if (typeof openaiAuth === 'string') {
        return openaiAuth;
      }
      if (openaiAuth.access) {
        return openaiAuth.access;
      }
      if (openaiAuth.token) {
        return openaiAuth.token;
      }
    }
  } catch (error) {
    console.warn('[STTService] Failed to read auth file:', error.message);
  }

  return null;
}

class STTService {
  constructor() {
    this._client = null;
    this._lastApiKey = null;
  }

  _getClient() {
    const apiKey = getOpenAIApiKey();

    if (apiKey && (!this._client || this._lastApiKey !== apiKey)) {
      this._client = new OpenAI({ apiKey });
      this._lastApiKey = apiKey;
    }

    return this._client;
  }

  isAvailable() {
    return this._getClient() !== null;
  }

  /**
   * Transcribe audio buffer to text
   * @param {Object} options
   * @param {Buffer} options.audioBuffer - Audio data buffer
   * @param {string} options.filename - Filename with extension (e.g., 'recording.webm')
   * @param {string} [options.language] - Language code (e.g., 'en')
   * @param {string} [options.model] - Model to use (default: 'whisper-1')
   * @param {string} [options.apiKey] - Optional API key override
   * @returns {Promise<{text: string, language?: string, duration?: number}>}
   */
  async transcribe(options) {
    const {
      audioBuffer,
      filename = 'recording.webm',
      language,
      model = 'whisper-1',
      apiKey
    } = options;

    let client;
    if (apiKey) {
      client = new OpenAI({ apiKey });
    } else {
      client = this._getClient();
    }

    if (!client) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable, configure OpenAI in OpenCode, or provide an API key in settings.');
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is required for transcription');
    }

    try {
      console.log('[STTService] Transcribing audio, size:', audioBuffer.length, 'bytes');

      const file = new File([audioBuffer], filename, {
        type: this.getMimeType(filename)
      });

      const transcriptionParams = {
        file,
        model,
        response_format: 'verbose_json',
      };

      if (language) {
        transcriptionParams.language = language;
      }

      const response = await client.audio.transcriptions.create(transcriptionParams);

      console.log('[STTService] Transcription complete, text length:', response.text?.length || 0);

      return {
        text: response.text || '',
        language: response.language,
        duration: response.duration,
      };
    } catch (error) {
      console.error('[STTService] Error transcribing audio:', error);
      throw new Error(`Failed to transcribe audio: ${error.message || 'Unknown error'}`);
    }
  }

  getMimeType(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      'webm': 'audio/webm',
      'mp3': 'audio/mpeg',
      'mp4': 'audio/mp4',
      'mpeg': 'audio/mpeg',
      'mpga': 'audio/mpeg',
      'm4a': 'audio/m4a',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
    };
    return mimeTypes[ext] || 'audio/webm';
  }
}

export const sttService = new STTService();
export { STTService };
