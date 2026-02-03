import { Audio } from 'expo-av';
import { supabase } from './supabase';
import { VoiceConfig } from '../types/persona';

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;

export async function generateSpeech(
  text: string,
  voiceConfig: VoiceConfig
): Promise<string | null> {
  if (!ELEVENLABS_API_KEY) {
    console.warn('ElevenLabs API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: voiceConfig.stability,
            similarity_boost: voiceConfig.similarityBoost ?? 0.75,
            style: voiceConfig.style ?? 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = await uploadAudioToStorage(audioBlob);

    return audioUrl;
  } catch (error) {
    console.error('Error generating speech:', error);
    return null;
  }
}

async function uploadAudioToStorage(blob: Blob): Promise<string> {
  const fileName = `audio/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;

  const { data, error } = await supabase.storage
    .from('tts-audio')
    .upload(fileName, blob, {
      contentType: 'audio/mpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload audio: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('tts-audio').getPublicUrl(data.path);

  return publicUrl;
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
