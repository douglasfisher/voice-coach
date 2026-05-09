-- ============================================================================
-- Migration 083: ai_models rows for TTS + image-gen so cost calculator
-- can resolve a price for every model name we record.
--
-- The cost-calculator divides (tokens * cost_per_million_input) by 1M to
-- get cents. For unit-consistent storage:
--   - Groq models: tokens, cents per million tokens (existing rows)
--   - ElevenLabs:  CHARACTERS treated as 'tokens'; cents per million chars.
--                  $0.30 / 1k chars = $300 / 1M chars = 30000 cents.
--   - Runware/google: cost is per-image and varies per request, so we
--                  set cost_per_million to 0 here; the runware edge
--                  function writes ai_usage with the exact cost from
--                  the Runware response, bypassing the helper. The row
--                  exists primarily so 'model' joins resolve to a name.
-- ============================================================================

INSERT INTO ai_models (id, name, provider, context_window, active,
                       cost_per_million_input, cost_per_million_output)
VALUES
  ('elevenlabs:eleven_turbo_v2_5',
   'ElevenLabs Turbo v2.5',
   'elevenlabs',
   10000,   -- max chars per request (provider-imposed)
   true,
   30000,   -- cents per million chars ($0.30 / 1k chars)
   0)
ON CONFLICT (id) DO UPDATE
  SET cost_per_million_input = EXCLUDED.cost_per_million_input,
      cost_per_million_output = EXCLUDED.cost_per_million_output,
      active = true,
      updated_at = now();

INSERT INTO ai_models (id, name, provider, context_window, active,
                       cost_per_million_input, cost_per_million_output)
VALUES
  -- Runware FLUX draft model. Cost-per-image varies by resolution; the
  -- runware edge function records the exact cost from the response, so
  -- the values below are placeholders for naming + filtering only.
  ('runware:400@1', 'Runware FLUX draft', 'runware', 0, true, 0, 0),
  ('google:4@2', 'Google Imagen (via Runware)', 'runware', 0, true, 0, 0)
ON CONFLICT (id) DO UPDATE
  SET active = true,
      provider = EXCLUDED.provider,
      updated_at = now();
