-- ============================================================================
-- Migration 082: Daily AI cost snapshot cron + backfill.
--
-- The create_daily_cost_snapshot() function (defined in migration 025) was
-- never scheduled. As a result ai_cost_snapshots stopped being populated
-- after the one-time backfill in 025. This migration:
--   1. Schedules the function to run nightly at 00:30 UTC via pg_cron.
--   2. Backfills missing snapshots for every distinct day in ai_usage
--      that doesn't already have a snapshot row.
--
-- pg_cron is a Supabase-managed extension; if it's not installed yet the
-- CREATE EXTENSION call is idempotent.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Backfill: for every distinct usage day that doesn't have a snapshot,
-- generate one. We run this serially so any errors halt the whole script
-- rather than partially populating the table.
DO $$
DECLARE
  d date;
BEGIN
  FOR d IN
    SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::date AS d
    FROM ai_usage
    WHERE created_at IS NOT NULL
    EXCEPT
    SELECT snapshot_date FROM ai_cost_snapshots
    ORDER BY 1
  LOOP
    -- Compute aggregates inline. Mirrors the structure of
    -- create_daily_cost_snapshot() (defined in migration 025) but avoids
    -- depending on its exact signature in case it varies between envs.
    INSERT INTO ai_cost_snapshots (
      snapshot_date,
      total_cost_cents,
      total_tokens,
      total_requests,
      cost_by_model,
      cost_by_persona,
      cost_by_user
    )
    SELECT
      d,
      COALESCE(SUM(estimated_cost_cents), 0)::int,
      COALESCE(SUM(total_tokens), 0)::int,
      COUNT(*)::int,
      COALESCE(jsonb_object_agg(model, model_cost) FILTER (WHERE model IS NOT NULL), '{}'::jsonb),
      '{}'::jsonb,
      '{}'::jsonb
    FROM (
      SELECT
        model,
        SUM(estimated_cost_cents) AS model_cost,
        SUM(total_tokens) AS total_tokens,
        SUM(estimated_cost_cents) AS estimated_cost_cents
      FROM ai_usage
      WHERE (created_at AT TIME ZONE 'UTC')::date = d
      GROUP BY model
    ) per_model;
  END LOOP;
END $$;

-- Schedule the canonical snapshot function to run nightly. If a job by
-- this name already exists (idempotent re-run), we unschedule it first.
DO $$
BEGIN
  PERFORM cron.unschedule('ai-cost-snapshot-daily')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'ai-cost-snapshot-daily'
  );
EXCEPTION WHEN OTHERS THEN
  -- pg_cron schema not yet visible to this role; ignore — the SELECT below
  -- will succeed once Supabase reloads the extension.
  NULL;
END $$;

SELECT cron.schedule(
  'ai-cost-snapshot-daily',
  '30 0 * * *',  -- every day at 00:30 UTC
  $$ SELECT create_daily_cost_snapshot(); $$
);
