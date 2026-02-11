import { Audio } from 'expo-av';
import { Sound } from 'expo-av/build/Audio';

let beepSound: Sound | null = null;

/**
 * Generate a minimal WAV file as a base64 data URI.
 * Creates a short sine-wave beep (~80ms, 880Hz, low volume).
 */
function generateBeepWav(): string {
  const sampleRate = 22050;
  const durationSec = 0.08;
  const frequency = 880;
  const amplitude = 0.15; // Very soft
  const numSamples = Math.floor(sampleRate * durationSec);

  // 16-bit PCM WAV header + data
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const fileSize = 44 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Generate sine wave with quick fade in/out
  const fadeLen = Math.floor(numSamples * 0.15);
  for (let i = 0; i < numSamples; i++) {
    let sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude;

    // Fade envelope
    if (i < fadeLen) {
      sample *= i / fadeLen;
    } else if (i > numSamples - fadeLen) {
      sample *= (numSamples - i) / fadeLen;
    }

    const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

/**
 * Play a very short, soft acknowledgement beep.
 * Preloads on first call, replays from cache after.
 */
export async function playBeep(): Promise<void> {
  try {
    if (!beepSound) {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: true, // Keep true since we're about to record
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: generateBeepWav() },
        { volume: 0.3, shouldPlay: false }
      );
      beepSound = sound;
    }

    await beepSound.setPositionAsync(0);
    await beepSound.playAsync();
  } catch (e) {
    // Non-critical - don't break dictation if beep fails
    console.warn('Beep sound failed:', e);
  }
}

/**
 * Unload cached sound to free resources.
 */
export async function unloadBeep(): Promise<void> {
  if (beepSound) {
    await beepSound.unloadAsync();
    beepSound = null;
  }
}
