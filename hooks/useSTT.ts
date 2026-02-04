import { useState, useCallback, useEffect, useRef } from 'react';
import {
  checkSTTAvailability,
  requestSTTPermission,
  getSTTPermissionStatus,
  startSTT,
  stopSTT,
  abortSTT,
  useSpeechRecognitionEvent,
  isSTTModuleAvailable,
} from '../lib/stt';

export interface UseSTTReturn {
  isListening: boolean;
  isAvailable: boolean;
  transcript: string;
  interimTranscript: string;
  audioLevel: number;
  error: string | null;

  startListening: () => Promise<void>;
  stopListening: () => Promise<string>;
  cancelListening: () => void;

  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useSTT(): UseSTTReturn {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const resolveRef = useRef<((value: string) => void) | null>(null);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  // Check availability and permission on mount
  useEffect(() => {
    async function init() {
      // First check if native module is even loaded
      if (!isSTTModuleAvailable()) {
        setIsAvailable(false);
        return;
      }

      const available = await checkSTTAvailability();
      setIsAvailable(available);

      if (available) {
        const permitted = await getSTTPermissionStatus();
        setHasPermission(permitted);
      }
    }
    init();
  }, []);

  // Handle speech recognition events
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    setAudioLevel(0);

    // Resolve the promise with final transcript, or interim as fallback
    if (resolveRef.current) {
      const result = finalTranscriptRef.current || interimTranscriptRef.current;
      resolveRef.current(result);
      resolveRef.current = null;
    }
  });

  useSpeechRecognitionEvent('result', (event: { results: Array<{ transcript: string; isFinal: boolean }> }) => {
    const results = event.results;
    if (!results || results.length === 0) return;

    // Get the most recent/complete result (last in array)
    const latestResult = results[results.length - 1];
    const text = latestResult.transcript;

    if (latestResult.isFinal) {
      finalTranscriptRef.current = text;
      interimTranscriptRef.current = '';
      setTranscript(text);
      setInterimTranscript('');
    } else {
      // Track interim in ref so we can use it as fallback
      interimTranscriptRef.current = text;
      setInterimTranscript(text);
    }
  });

  useSpeechRecognitionEvent('volumechange', (event: { value: number }) => {
    // Normalize volume to 0-1 range
    // expo-speech-recognition returns values roughly in dB range
    const normalizedLevel = Math.min(1, Math.max(0, (event.value + 2) / 10));
    setAudioLevel(normalizedLevel);
  });

  useSpeechRecognitionEvent('error', (event: { error: string }) => {
    setIsListening(false);
    setAudioLevel(0);

    const errorMessage = getErrorMessage(event.error);
    setError(errorMessage);

    // Resolve with whatever we have
    if (resolveRef.current) {
      resolveRef.current(finalTranscriptRef.current || transcript || interimTranscript);
      resolveRef.current = null;
    }
  });

  const requestPermissionHandler = useCallback(async (): Promise<boolean> => {
    const granted = await requestSTTPermission();
    setHasPermission(granted);
    return granted;
  }, []);

  const startListening = useCallback(async (): Promise<void> => {
    if (!isAvailable) {
      setError('Speech recognition is not available');
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermissionHandler();
      if (!granted) {
        setError('Microphone permission denied');
        return;
      }
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';

    try {
      await startSTT({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }, [isAvailable, hasPermission, requestPermissionHandler]);

  const stopListening = useCallback(async (): Promise<string> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;

      stopSTT().catch(() => {
        // If stop fails, resolve with current transcript
        const result = finalTranscriptRef.current || interimTranscriptRef.current;
        resolve(result);
        resolveRef.current = null;
      });

      // Timeout fallback
      setTimeout(() => {
        if (resolveRef.current) {
          const result = finalTranscriptRef.current || interimTranscriptRef.current;
          resolve(result);
          resolveRef.current = null;
        }
      }, 2000);
    });
  }, []);

  const cancelListening = useCallback(() => {
    resolveRef.current = null;
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setAudioLevel(0);
    abortSTT().catch(() => {});
    setIsListening(false);
  }, []);

  return {
    isListening,
    isAvailable,
    transcript,
    interimTranscript,
    audioLevel,
    error,
    startListening,
    stopListening,
    cancelListening,
    hasPermission,
    requestPermission: requestPermissionHandler,
  };
}

function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'no-speech':
      return 'No speech detected';
    case 'audio-capture':
      return 'Microphone not available';
    case 'not-allowed':
      return 'Microphone permission denied';
    case 'network':
      return 'Network error';
    case 'aborted':
      return null as unknown as string; // User cancelled, not an error
    default:
      return 'Speech recognition error';
  }
}
