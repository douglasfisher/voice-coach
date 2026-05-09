-- Migration: Add native TTS preference
-- Uses free on-device speech synthesis (expo-speech) to read AI responses aloud

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS native_tts_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_preferences.native_tts_enabled IS 'Enable free native device TTS to read AI responses aloud (separate from premium ElevenLabs tts_enabled)';
