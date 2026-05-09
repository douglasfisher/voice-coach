-- ============================================================================
-- Migration 080: Default voice IDs per gender + provider.
--
-- Voice ID is a required field on personas, but the value comes from a
-- third-party provider (currently ElevenLabs) and is opaque (e.g.
-- "pMsXgVXv3BLzUgSXRplE"). New personas should auto-populate this from
-- the provider catalogue based on gender so admins don't have to look up
-- a voice ID for every persona.
--
-- Defaults below are the most-used IDs across active personas as of
-- 2026-05 (39 male, 8 female). Editable later if you swap providers
-- or want different defaults.
-- ============================================================================

INSERT INTO app_settings (key, value, description)
VALUES (
  'ai_voice_defaults',
  jsonb_build_object(
    'provider', 'elevenlabs',
    'by_gender', jsonb_build_object(
      'male',   'pMsXgVXv3BLzUgSXRplE',
      'female', 'jsCqWAovK2LkecY7zXl4'
    ),
    -- Tracked so the UI can detect "still on a default" and auto-update
    -- when gender changes, while preserving an admin's manual override.
    'all_default_ids', jsonb_build_array(
      'pMsXgVXv3BLzUgSXRplE',
      'jsCqWAovK2LkecY7zXl4'
    )
  ),
  'Default voice IDs used when a persona is created. Keyed by gender. all_default_ids lets the form auto-update when gender changes without overwriting manual choices.'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();
