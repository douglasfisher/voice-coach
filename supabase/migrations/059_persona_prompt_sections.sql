-- Migration 059: Add prompt_sections JSONB column to personas
-- Stores individual prompt sections for the sectioned prompt builder
-- Enables reloading/editing sections after initial creation

ALTER TABLE personas ADD COLUMN IF NOT EXISTS prompt_sections JSONB;

COMMENT ON COLUMN personas.prompt_sections IS 'Stores individual prompt sections (identity, trait_tokens, character_traits, roleplay_behavior, coaching_approach) for the sectioned prompt builder';
