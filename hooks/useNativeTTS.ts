import { useState, useCallback, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';

// Known female voice name patterns
const FEMALE_NAMES = ['samantha', 'karen', 'kate', 'moira', 'tessa', 'fiona', 'victoria', 'allison', 'ava', 'susan', 'zoe', 'nicky'];
// Known male voice name patterns
const MALE_NAMES = ['aaron', 'fred', 'daniel', 'alex', 'tom', 'oliver', 'james', 'ralph', 'bruce', 'lee', 'rishi'];

function isFemaleName(identifier: string): boolean {
  const lower = identifier.toLowerCase();
  return FEMALE_NAMES.some((n) => lower.includes(n));
}

function isMaleName(identifier: string): boolean {
  const lower = identifier.toLowerCase();
  return MALE_NAMES.some((n) => lower.includes(n));
}

export function useNativeTTS(gender: 'male' | 'female' = 'male') {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const speakingRef = useRef(false);
  const voiceMapRef = useRef<{ male?: string; female?: string }>({});
  const voicesReady = useRef(false);

  // Discover voices once, build a male/female map
  useEffect(() => {
    let cancelled = false;

    async function discoverVoices() {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (cancelled || voices.length === 0) return;

        const enVoices = voices.filter((v) => v.language.startsWith('en'));
        if (enVoices.length === 0) return;

        // Find best female voice
        const femaleVoice = enVoices.find((v) => isFemaleName(v.identifier));
        // Find best male voice
        const maleVoice = enVoices.find((v) => isMaleName(v.identifier));

        // If we found gendered voices, use them; otherwise split the list
        if (femaleVoice || maleVoice) {
          voiceMapRef.current = {
            female: femaleVoice?.identifier || enVoices[0].identifier,
            male: maleVoice?.identifier || enVoices[enVoices.length > 1 ? 1 : 0].identifier,
          };
        } else if (enVoices.length >= 2) {
          // No name matches — just use first two different voices
          voiceMapRef.current = {
            female: enVoices[0].identifier,
            male: enVoices[1].identifier,
          };
        } else {
          voiceMapRef.current = {
            female: enVoices[0].identifier,
            male: enVoices[0].identifier,
          };
        }

        voicesReady.current = true;

        if (__DEV__) {
          console.log('[NativeTTS] Available EN voices:', enVoices.map((v) => v.identifier));
          console.log('[NativeTTS] Voice map:', voiceMapRef.current);
        }
      } catch {
        // Voice discovery failed — will speak without specific voice
      }
    }

    discoverVoices();
    return () => { cancelled = true; };
  }, []);

  const speak = useCallback((text: string) => {
    if (isMuted || !text) return;

    Speech.stop();
    speakingRef.current = true;
    setIsSpeaking(true);

    const voiceId = voiceMapRef.current[gender];

    const options: Speech.SpeechOptions = {
      language: 'en-US',
      rate: 1.0,
      pitch: gender === 'female' ? 1.1 : 0.9,
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

    if (voiceId) {
      options.voice = voiceId;
    }

    Speech.speak(text, options);
  }, [isMuted, gender]);

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
