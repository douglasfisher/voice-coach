-- Migration: Add dating/gender preferences to user_preferences
-- Allows personalized scenario generation with correct pronouns

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS user_gender TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS interested_in TEXT DEFAULT NULL;

-- user_gender: 'male' | 'female' | null
-- interested_in: 'men' | 'women' | null
