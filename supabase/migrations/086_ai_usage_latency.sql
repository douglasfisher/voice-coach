-- ============================================================================
-- Migration 086: AI request latency on ai_usage.
--
-- Adds a nullable latency_ms column so the chat edge function can record
-- the wall-clock time of each Groq call. Used by the per-persona
-- performance dashboard to surface p50/p95 latency — slow personas
-- frustrate users independently of cost, and we currently have no way
-- to see it.
--
-- Nullable so historical rows (and any path that doesn't time itself
-- yet) don't fail to insert.
-- ============================================================================

ALTER TABLE ai_usage
  ADD COLUMN IF NOT EXISTS latency_ms integer;

CREATE INDEX IF NOT EXISTS idx_ai_usage_persona_created
  ON ai_usage (persona_id, created_at DESC)
  WHERE persona_id IS NOT NULL;

COMMENT ON COLUMN ai_usage.latency_ms IS
  'Wall-clock duration of the AI provider request, milliseconds. NULL for rows recorded before this column existed or for paths that don''t time themselves (e.g. image generation where the upstream provider doesn''t expose latency).';
