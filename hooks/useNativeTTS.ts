import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

// Preferred iOS voice IDs in priority order
const IOS_FEMALE_PREFERRED = [
  'com.apple.voice.compact.en-US.Samantha',
  'com.apple.voice.compact.en-AU.Karen',
  'com.apple.voice.compact.en-GB.Kate',
];
const IOS_MALE_PREFERRED = [
  'com.apple.voice.compact.en-US.Aaron',
  'com.apple.voice.compact.en-US.Fred',
  'com.apple.voice.compact.en-GB.Daniel',
];

export function useNativeTTS(gender: 'male' | 'female' = 'male') {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const speakingRef = useRef(false);
  const resolvedVoice = useRef<string | undefined>(undefined);

  // Discover available voices and pick the best match for gender
  useEffect(() => {
    let cancelled = false;

    async function resolveVoice() {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (cancelled) return;

        // Filter to English voices
        const enVoices = voices.filter((v) => v.language.startsWith('en'));

        // Try preferred voices first
        const preferred = gender === 'female' ? IOS_FEMALE_PREFERRED : IOS_MALE_PREFERRED;
        for (const id of preferred) {
          if (enVoices.some((v) => v.identifier === id)) {
            resolvedVoice.current = id;
            return;
          }
        }

        // Fallback: pick any English voice (first available)
        if (enVoices.length > 0) {
          resolvedVoice.current = enVoices[0].identifier;
        }
      } catch {
        // Voice discovery failed — speak without a specific voice
        resolvedVoice.current = undefined;
      }
    }

    resolveVoice();
    return () => { cancelled = true; };
  }, [gender]);

  const speak = useCallback((text: string) => {
    if (isMuted || !text) return;

    Speech.stop();
    speakingRef.current = true;
    setIsSpeaking(true);

    const options: Speech.SpeechOptions = {
      language: 'en-US',
      rate: 1.0,
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
    };

    if (resolvedVoice.current) {
      options.voice = resolvedVoice.current;
    }

    Speech.speak(text, options);
  }, [isMuted]);

  const stop = useCallback(() => {
    Speech.stop();
    speakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) {
        Speech.stop();
        speakingRef.current = false;
        setIsSpeaking(false);
      }
      return !prev;
    });
  }, []);

  return { speak, stop, isSpeaking, isMuted, toggleMute };
}
