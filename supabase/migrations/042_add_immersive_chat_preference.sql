-- Migration: Add immersive_chat_enabled column to user_preferences
-- This column was referenced in TypeScript types but never created in the database

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS immersive_chat_enabled BOOLEAN DEFAULT TRUE;
