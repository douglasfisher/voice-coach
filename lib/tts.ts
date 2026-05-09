import { Audio } from 'expo-av';
import { supabase } from './supabase';
import { useAuthStore } from '../stores/authStore';
import { VoiceConfig } from '../types/persona';

/**
 * Generate speech via the `tts` edge function.
 *
 * Replaces the previous direct call to api.elevenlabs.io which leaked
 * the provider API key in the bundle. The edge function:
 *   - Authenticates with the SECRET ElevenLabs key (never exposed)
 *   - Uploads the audio to the tts-audio bucket
 *   - Records ai_usage so spoken-response spend is visible alongside
 *     Groq + Runware in the admin dashboard
 *   - Returns a public URL — same return shape as before, so callers
 *     don't need to change.
 *
 * Optional context (conversationId, personaId) flows through to the
 * usage record so per-persona / per-conversation cost analysis works.
 */
export async function generateSpeech(
  text: string,
  voiceConfig: VoiceConfig,
  context?: { conversationId?: string | null; personaId?: string | null },
): Promise<string | null> {
  if (!text.trim()) return null;

  try {
    const userId = useAuthStore.getState().user?.id ?? null;
    const { data, error } = await supabase.functions.invoke('tts', {
      body: {
        text,
        voiceId: voiceConfig.voiceId,
        voiceConfig: {
          stability: voiceConfig.stability,
          similarityBoost: voiceConfig.similarityBoost ?? 0.75,
          style: voiceConfig.style ?? 0.5,
        },
        userId,
        conversationId: context?.conversationId ?? null,
        personaId: context?.personaId ?? null,
      },
    });

    if (error) {
      console.error('TTS function error:', error.message);
      return null;
    }
    const url = (data as { url?: string } | null)?.url;
    return url ?? null;
  } catch (err) {
    console.error('Error generating speech:', err);
    return null;
  }
}

export class TTSPlayer {
  private sound: Audio.Sound | null = null;
  private isPlaying = false;

  async play(audioUrl: string): Promise<void> {
    await this.stop();

    const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
    this.sound = sound;
    this.isPlaying = true;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        this.isPlaying = false;
      }
    });

    await sound.playAsync();
  }

  async stop(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
      this.isPlaying = false;
    }
  }

  async pause(): Promise<void> {
    if (this.sound && this.isPlaying) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
    }
  }

  async resume(): Promise<void> {
    if (this.sound && !this.isPlaying) {
      await this.sound.playAsync();
      this.isPlaying = true;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
