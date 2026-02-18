import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

// iOS Siri voices that sound decent
const IOS_FEMALE_VOICE = 'com.apple.voice.compact.en-US.Samantha';
const IOS_MALE_VOICE = 'com.apple.voice.compact.en-US.Aaron';

// Android fallback — language code only, system picks a voice
const ANDROID_LANG = 'en-US';

export function useNativeTTS(gender: 'male' | 'female' = 'male') {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const speakingRef = useRef(false);
  const resolvedVoice = useRef<string | undefined>(undefined);

  // Resolve best available voice on mount
  useEffect(() => {
    if (Platform.OS === 'ios') {
      resolvedVoice.current = gender === 'female' ? IOS_FEMALE_VOICE : IOS_MALE_VOICE;
    }
    // On Android we just use language, no specific voice ID
  }, [gender]);

  const speak = useCallback((text: string) => {
    if (isMuted || !text) return;

    Speech.stop();
    speakingRef.current = true;
    setIsSpeaking(true);

    const options: Speech.SpeechOptions = {
      language: ANDROID_LANG,
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

    // iOS: use specific voice ID for gender
    if (Platform.OS === 'ios' && resolvedVoice.current) {
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
