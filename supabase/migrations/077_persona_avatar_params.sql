-- ============================================================================
-- Migration 077: Persist avatar generation parameters per persona.
--
-- The avatar wizard re-opens against a persona's existing avatar should
-- restore the 9 generation parameters (gender, age_range, ethnicity,
-- appearance, lighting, clothing, expression, accessories, pose, camera)
-- and the natural-language prompt used. Without this column, the form
-- always opens at the global defaults and the admin has to reconstruct
-- their settings from memory — frustrating for tweak-and-regenerate cycles.
--
-- Shape of the JSONB:
--   {
--     "params": {
--       "gender": "...", "age_range": "...", "ethnicity": "...",
--       "appearance": "...", "lighting": "...", "clothing": "...",
--       "expression": "...", "accessories": [...], "pose": "...",
--       "camera": "..."
--     },
--     "prompt": "..."          -- the prompt that was actually sent
--   }
-- ============================================================================

ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS avatar_params jsonb;

COMMENT ON COLUMN personas.avatar_params IS
  'Avatar generation parameters + prompt last used to produce avatar_url. Re-hydrated by the persona avatar editor so admins can tweak-and-regenerate without re-entering all 9 fields.';
