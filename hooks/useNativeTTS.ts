import { useState, useCallback, useRef } from 'react';
import * as Speech from 'expo-speech';

export function useNativeTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const speakingRef = useRef(false);

  const speak = useCallback((text: string) => {
    if (isMuted || !text) return;

    // Stop any current speech first
    Speech.stop();

    speakingRef.current = true;
    setIsSpeaking(true);

    Speech.speak(text, {
      onDone: () => {
        speakingRef.current = false;
        setIsSpeaking(false);
      },
      onStopped: () => {
        speakingRef.current = false;
        setIsSpeaking(false);
      },
      onError: () => {
        speakingRef.current = false;
        setIsSpeaking(false);
      },
    });
  }, [isMuted]);

  const stop = useCallback(() => {
    Speech.stop();
    speakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) {
        // Muting — stop any current speech
        Speech.stop();
        speakingRef.current = false;
        setIsSpeaking(false);
      }
      return !prev;
    });
  }, []);

  return { speak, stop, isSpeaking, isMuted, toggleMute };
}
