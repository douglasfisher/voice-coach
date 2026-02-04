import { useState, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useSTT } from './useSTT';

export type VoiceInputState = 'idle' | 'recording' | 'processing' | 'error';

export interface UseVoiceInputReturn {
  state: VoiceInputState;
  transcript: string;
  interimTranscript: string;
  audioLevel: number;
  error: string | null;

  handlers: {
    onPressIn: () => void;
    onPressOut: () => Promise<string>;
    onCancel: () => void;
  };

  isEnabled: boolean;
  isAvailable: boolean;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useVoiceInput(enabled: boolean = true): UseVoiceInputReturn {
  const {
    isListening,
    isAvailable,
    hasPermission,
    transcript,
    interimTranscript,
    audioLevel,
    error: sttError,
    startListening,
    stopListening,
    cancelListening,
    requestPermission,
  } = useSTT();

  const [state, setState] = useState<VoiceInputState>('idle');
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const onPressIn = useCallback(() => {
    if (!enabled || !isAvailable) return;

    cancelledRef.current = false;
    setError(null);
    setState('recording');

    // Haptic feedback on start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    startListening().catch((err) => {
      setState('error');
      setError((err as Error).message);
    });
  }, [enabled, isAvailable, startListening]);

  const onPressOut = useCallback(async (): Promise<string> => {
    if (cancelledRef.current) {
      setState('idle');
      return '';
    }

    if (state !== 'recording') {
      return '';
    }

    setState('processing');

    // Light haptic on release
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const finalTranscript = await stopListening();
      setState('idle');

      if (finalTranscript.trim()) {
        // Success haptic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      return finalTranscript;
    } catch (err) {
      setState('error');
      setError((err as Error).message);
      return '';
    }
  }, [state, stopListening]);

  const onCancel = useCallback(() => {
    cancelledRef.current = true;

    // Error haptic for cancel
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    cancelListening();
    setState('idle');
    setError(null);
  }, [cancelListening]);

  // Combine STT error with local error
  const displayError = error || sttError;

  return {
    state: isListening ? 'recording' : state,
    transcript,
    interimTranscript,
    audioLevel,
    error: displayError,

    handlers: {
      onPressIn,
      onPressOut,
      onCancel,
    },

    isEnabled: enabled && isAvailable,
    isAvailable,
    hasPermission,
    requestPermission,
  };
}
