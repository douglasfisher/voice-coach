import { useState, useRef, useCallback, useEffect } from 'react';
import { TTSPlayer, generateSpeech } from '../lib/tts';
import { VoiceConfig } from '../types/persona';

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  const playerRef = useRef<TTSPlayer | null>(null);

  useEffect(() => {
    playerRef.current = new TTSPlayer();
    return () => {
      playerRef.current?.stop();
    };
  }, []);

  const play = useCallback(async (audioUrl: string) => {
    if (!playerRef.current) return;

    try {
      setError(null);
      await playerRef.current.play(audioUrl);
      setIsPlaying(true);
      setCurrentAudioUrl(audioUrl);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const stop = useCallback(async () => {
    if (!playerRef.current) return;

    await playerRef.current.stop();
    setIsPlaying(false);
  }, []);

  const pause = useCallback(async () => {
    if (!playerRef.current) return;

    await playerRef.current.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    if (!playerRef.current) return;

    await playerRef.current.resume();
    setIsPlaying(true);
  }, []);

  const generateAndPlay = useCallback(
    async (text: string, voiceConfig: VoiceConfig) => {
      setIsLoading(true);
      setError(null);

      try {
        const audioUrl = await generateSpeech(text, voiceConfig);
        if (audioUrl) {
          await play(audioUrl);
          return audioUrl;
        }
        return null;
      } catch (err) {
        setError((err as Error).message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [play]
  );

  return {
    isPlaying,
    isLoading,
    error,
    currentAudioUrl,
    play,
    stop,
    pause,
    resume,
    generateAndPlay,
  };
}
