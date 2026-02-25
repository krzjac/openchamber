/**
 * useBrowserVoice Hook
 *
 * React hook for browser-based voice recording and transcription.
 * Records audio using MediaRecorder and sends to server for transcription.
 *
 * @example
 * ```typescript
 * const {
 *   status,
 *   isSupported,
 *   language,
 *   setLanguage,
 *   startVoice,
 *   stopVoice,
 *   isMobile,
 * } = useBrowserVoice();
 *
 * // Start recording
 * startVoice();
 *
 * // Stop recording and get transcription
 * await stopVoice();
 * ```
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { browserVoiceService } from '@/lib/voice/browserVoiceService';
import { useSessionStore } from '@/stores/useSessionStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { useServerTTS } from './useServerTTS';
import { useSayTTS } from './useSayTTS';

export type BrowserVoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface UseBrowserVoiceReturn {
  status: BrowserVoiceStatus;
  isSupported: boolean;
  error: string | null;
  language: string;
  setLanguage: (lang: string) => void;
  startVoice: () => Promise<void>;
  stopVoice: () => Promise<void>;
  conversationMode: boolean;
  toggleConversationMode: () => void;
  prepareVoice: () => Promise<boolean>;
  isMobile: boolean;
  voiceProvider: 'browser' | 'openai' | 'say';
}

const LANGUAGE_STORAGE_KEY = 'browserVoiceLanguage';
const CONVERSATION_MODE_STORAGE_KEY = 'browserVoiceConversationMode';
const LANGUAGE_CHANGE_EVENT = 'openchamber:voice-language-changed';
const CONVERSATION_MODE_CHANGE_EVENT = 'openchamber:voice-conversation-mode-changed';
const BLOCKED_SPEECH_LANGUAGES = new Set(['ru', 'ru-RU']);

const sanitizeSpeechLanguage = (lang: string): string => {
  const normalized = (lang || '').trim();
  if (!normalized) {
    return 'en-US';
  }
  const base = normalized.split('-')[0].toLowerCase();
  if (BLOCKED_SPEECH_LANGUAGES.has(normalized) || BLOCKED_SPEECH_LANGUAGES.has(base)) {
    return 'en-US';
  }
  return normalized;
};

export function useBrowserVoice(): UseBrowserVoiceReturn {
  const [status, setStatus] = useState<BrowserVoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguageState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved) return sanitizeSpeechLanguage(saved);
    }
    return sanitizeSpeechLanguage(navigator.language || 'en-US');
  });
  const [conversationMode, setConversationModeState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CONVERSATION_MODE_STORAGE_KEY);
      return saved === 'true';
    }
    return false;
  });

  const isSupported = browserVoiceService.isSupported();

  const isMobile = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod|android|mobile|webos|blackberry|iemobile|opera mini/i.test(userAgent);
  }, []);

  const isActiveRef = useRef(false);
  const processingMessageRef = useRef(false);
  const messagesRef = useRef<Map<string, { info: { role: string }; parts: Array<{ type: string; text?: string }> }>>(new Map());
  const pendingResumeOnVisibleRef = useRef(false);

  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const setPendingInputText = useSessionStore((s) => s.setPendingInputText);
  const messages = useSessionStore((s) => s.messages);
  const { openaiApiKey, voiceProvider } = useConfigStore();

  useEffect(() => {
    browserVoiceService.setApiKey(openaiApiKey || null);
  }, [openaiApiKey]);

  const { speak: speakServerTTS, stop: stopServerTTS, isAvailable: isServerTTSAvailable, unlockAudio: unlockServerTTSAudio } = useServerTTS();
  const { speak: speakSayTTS, stop: stopSayTTS, isAvailable: isSayTTSAvailable, unlockAudio: unlockSayTTSAudio } = useSayTTS();

  useEffect(() => {
    if (currentSessionId) {
      const sessionMessages = messages.get(currentSessionId);
      if (sessionMessages) {
        messagesRef.current = new Map(sessionMessages.map(m => [m.info.id, m]));
      }
    }
  }, [messages, currentSessionId]);

  const prevSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevSessionIdRef.current !== null && prevSessionIdRef.current !== currentSessionId) {
      if (isActiveRef.current) {
        console.log('[useBrowserVoice] Session changed, stopping voice');
        isActiveRef.current = false;
        processingMessageRef.current = false;
        browserVoiceService.stopListening();
        browserVoiceService.cancelSpeech();
        setStatus('idle');
        setError(null);
      }
    }
    prevSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const setLanguage = useCallback((lang: string) => {
    const nextLang = sanitizeSpeechLanguage(lang);
    setLanguageState(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
      window.dispatchEvent(new CustomEvent<string>(LANGUAGE_CHANGE_EVENT, { detail: nextLang }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleLanguageEvent = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const nextLang = sanitizeSpeechLanguage(customEvent.detail || localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en-US');
      setLanguageState((prev) => (prev === nextLang ? prev : nextLang));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_STORAGE_KEY || !event.newValue) {
        return;
      }
      const nextLang = sanitizeSpeechLanguage(event.newValue);
      setLanguageState((prev) => (prev === nextLang ? prev : nextLang));
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageEvent as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageEvent as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleConversationMode = useCallback(() => {
    setConversationModeState((prev) => {
      const next = !prev;
      browserVoiceService.setConversationMode(next);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CONVERSATION_MODE_STORAGE_KEY, String(next));
        window.dispatchEvent(new CustomEvent<boolean>(CONVERSATION_MODE_CHANGE_EVENT, { detail: next }));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleConversationModeEvent = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      const detail = customEvent.detail;
      if (typeof detail !== 'boolean') {
        return;
      }
      setConversationModeState((prev) => (prev === detail ? prev : detail));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CONVERSATION_MODE_STORAGE_KEY || event.newValue == null) {
        return;
      }
      const next = event.newValue === 'true';
      setConversationModeState((prev) => (prev === next ? prev : next));
    };

    window.addEventListener(CONVERSATION_MODE_CHANGE_EVENT, handleConversationModeEvent as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CONVERSATION_MODE_CHANGE_EVENT, handleConversationModeEvent as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    browserVoiceService.setConversationMode(conversationMode);
  }, [conversationMode]);

  const handleTranscription = useCallback((text: string) => {
    console.log('[useBrowserVoice] Got transcription:', text);
  }, []);

  const handleError = useCallback((errorMsg: string) => {
    if (!isActiveRef.current) {
      console.log('[useBrowserVoice] Ignoring error after voice stopped:', errorMsg);
      return;
    }

    console.error('[useBrowserVoice] Recording/transcription error:', errorMsg);
    setError(errorMsg);
    setStatus('error');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      if (!pendingResumeOnVisibleRef.current) {
        return;
      }
      if (!isActiveRef.current || !conversationMode) {
        pendingResumeOnVisibleRef.current = false;
        return;
      }

      pendingResumeOnVisibleRef.current = false;
      setStatus('listening');
      browserVoiceService.startRecording(language, handleTranscription, handleError).catch((err) => {
        const errorMsg = err instanceof Error ? err.message : 'Failed to resume voice';
        setError(errorMsg);
        setStatus('error');
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [conversationMode, language, handleTranscription, handleError]);

  const prepareVoice = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }
    try {
      await browserVoiceService.prepareListening();
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Microphone permission denied';
      setError(errorMsg);
      return false;
    }
  }, [isSupported]);

  const startVoice = useCallback(async () => {
    if (!isSupported) {
      setError('Browser voice not supported');
      setStatus('error');
      return;
    }

    if (!openaiApiKey) {
      setError('OpenAI API key required. Please configure it in Voice settings.');
      setStatus('error');
      return;
    }

    isActiveRef.current = true;
    setError(null);
    setStatus('listening');

    if (isMobile) {
      try {
        browserVoiceService.unlockAudio().catch(() => {});
        unlockServerTTSAudio().catch(() => {});
        unlockSayTTSAudio().catch(() => {});
        await browserVoiceService.startRecording(language, handleTranscription, handleError);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to start voice';
        console.error('[useBrowserVoice] Mobile voice start error:', errorMsg);
        setError(errorMsg);
        setStatus('error');
        isActiveRef.current = false;
      }
    } else {
      try {
        await browserVoiceService.startRecording(language, handleTranscription, handleError);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to start voice';
        console.error('[useBrowserVoice] Desktop voice start error:', errorMsg);
        setError(errorMsg);
        setStatus('error');
        isActiveRef.current = false;
      }
    }
  }, [isSupported, language, handleTranscription, handleError, isMobile, unlockServerTTSAudio, unlockSayTTSAudio]);

  const stopVoice = useCallback(async () => {
    const wasRecording = browserVoiceService.getIsListening();

    isActiveRef.current = false;
    processingMessageRef.current = false;
    pendingResumeOnVisibleRef.current = false;

    browserVoiceService.stopListening();
    browserVoiceService.cancelSpeech();
    stopServerTTS();
    stopSayTTS();

    if (wasRecording) {
      setStatus('processing');

      try {
        console.log('[useBrowserVoice] Stopping recording, waiting for transcription...');
        const transcribedText = await browserVoiceService.stopRecording();
        console.log('[useBrowserVoice] Transcription result:', transcribedText);

        if (transcribedText && transcribedText.trim()) {
          console.log('[useBrowserVoice] Setting pending input text:', transcribedText.trim());
          setPendingInputText(transcribedText.trim(), 'replace', true);
        } else if (transcribedText === null) {
          console.log('[useBrowserVoice] No transcription result (null)');
        } else {
          console.log('[useBrowserVoice] Empty transcription result');
          setError('No speech detected. Please try again.');
          setStatus('error');
          return;
        }
      } catch (err) {
        console.error('[useBrowserVoice] Failed to process transcription:', err);
        setError(err instanceof Error ? err.message : 'Failed to process transcription');
        setStatus('error');
        return;
      }
    }

    setStatus('idle');
    setError(null);
  }, [stopServerTTS, stopSayTTS, setPendingInputText]);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      browserVoiceService.setConversationMode(false);
      browserVoiceService.stopListening();
      browserVoiceService.cancelSpeech();
    };
  }, []);

  return {
    status,
    isSupported,
    error,
    language,
    setLanguage,
    startVoice,
    stopVoice,
    conversationMode,
    toggleConversationMode,
    prepareVoice,
    isMobile,
    voiceProvider,
  };
}
