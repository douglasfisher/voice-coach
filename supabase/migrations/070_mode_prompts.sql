-- Migration 070: Add mode_prompts JSONB column to personas
--
-- Allows optional per-mode system prompt overrides:
--   qa_roleplay:    Used when persona is in Q&A/question_mode roleplay
--   coaching_chat:  Used when persona is coaching (coach_leads, user_leads, turn_taking)
--   feedback:       Used for feedback phase analysis
--
-- Resolution: mode_prompts[current_mode] ?? system_prompt (backward compatible)

ALTER TABLE personas ADD COLUMN IF NOT EXISTS mode_prompts JSONB;

COMMENT ON COLUMN personas.mode_prompts IS 'Optional per-mode system prompt overrides. Keys: qa_roleplay, coaching_chat, feedback. Falls back to system_prompt when null/missing.';
