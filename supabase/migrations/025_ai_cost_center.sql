-- AI Cost Center Migration
-- Adds budget tracking, cost snapshots, task type tracking, and fixes cost calculation

-- =============================================================================
-- 0. ADD TASK_TYPE TO AI_USAGE FOR SERVICE BREAKDOWN
-- =============================================================================

-- Add task_type column if it doesn't exist
ALTER TABLE public.ai_usage
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'chat';

-- Add index for task_type queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_task_type
  ON ai_usage(task_type, created_at DESC);

COMMENT ON COLUMN public.ai_usage.task_type IS 'Type of AI task: chat, report, analyze, daily_challenge, greeting, etc.';

-- =============================================================================
-- 1. BUDGET TRACKING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('daily', 'weekly', 'monthly', 'total')),
  limit_cents INTEGER NOT NULL,
  alert_threshold_percent INTEGER DEFAULT 80 CHECK (alert_threshold_percent BETWEEN 1 AND 100),
  current_spend_cents INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  notify_on_threshold BOOLEAN DEFAULT true,
  notify_on_exceeded BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for ai_budgets
ALTER TABLE public.ai_budgets ENABLE ROW LEVEL SECURITY;

-- Admins can manage budgets
CREATE POLICY "Admins can manage ai_budgets"
  ON public.ai_budgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =============================================================================
-- 2. COST SNAPSHOTS TABLE (Historical daily aggregates)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  total_cost_cents INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  cost_by_model JSONB DEFAULT '{}',
  cost_by_persona JSONB DEFAULT '{}',
  cost_by_user JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date)
);

-- Enable RLS for ai_cost_snapshots
ALTER TABLE public.ai_cost_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can read snapshots
CREATE POLICY "Admins can read ai_cost_snapshots"
  ON public.ai_cost_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Service role can manage snapshots (for scheduled jobs)
CREATE POLICY "Service role can manage ai_cost_snapshots"
  ON public.ai_cost_snapshots FOR ALL
  TO service_role
  WITH CHECK (true);

-- =============================================================================
-- 3. INDEXES FOR EFFICIENT COST QUERIES
-- =============================================================================

-- Composite index for cost analysis queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_cost_analysis
  ON ai_usage(created_at, model, user_id, estimated_cost_cents);

-- Index for budget period lookups
CREATE INDEX IF NOT EXISTS idx_ai_budgets_active
  ON ai_budgets(is_active, budget_type) WHERE is_active = true;

-- Index for snapshot date lookups
CREATE INDEX IF NOT EXISTS idx_ai_cost_snapshots_date
  ON ai_cost_snapshots(snapshot_date DESC);

-- =============================================================================
-- 4. COST CALCULATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_ai_cost(
  p_model TEXT,
  p_prompt_tokens INTEGER,
  p_completion_tokens INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_input_cost NUMERIC;
  v_output_cost NUMERIC;
  v_model_pricing RECORD;
BEGIN
  -- Lookup model pricing from ai_models table
  SELECT cost_per_million_input, cost_per_million_output
  INTO v_model_pricing
  FROM ai_models
  WHERE id = p_model;

  -- Return 0 if model not found
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate cost in cents
  -- cost_per_million is in cents per million tokens
  v_input_cost := (p_prompt_tokens::NUMERIC / 1000000) * v_model_pricing.cost_per_million_input;
  v_output_cost := (p_completion_tokens::NUMERIC / 1000000) * v_model_pricing.cost_per_million_output;

  -- Return ceiling to ensure we round up fractional cents
  RETURN CEIL(v_input_cost + v_output_cost);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_ai_cost IS 'Calculates AI usage cost in cents based on model pricing';

-- =============================================================================
-- 5. BACKFILL HISTORICAL COST DATA
-- =============================================================================

-- Update all existing ai_usage records that have 0 cost
UPDATE ai_usage
SET estimated_cost_cents = calculate_ai_cost(model, prompt_tokens, completion_tokens)
WHERE estimated_cost_cents = 0
  AND prompt_tokens > 0;

-- =============================================================================
-- 6. CREATE DAILY SNAPSHOT FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION create_daily_cost_snapshot(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
DECLARE
  v_date_start TIMESTAMPTZ;
  v_date_end TIMESTAMPTZ;
  v_total_cost INTEGER;
  v_total_tokens INTEGER;
  v_total_requests INTEGER;
  v_by_model JSONB;
  v_by_persona JSONB;
  v_by_user JSONB;
BEGIN
  v_date_start := p_date::TIMESTAMPTZ;
  v_date_end := (p_date + 1)::TIMESTAMPTZ;

  -- Aggregate totals for the day
  SELECT
    COALESCE(SUM(estimated_cost_cents), 0),
    COALESCE(SUM(total_tokens), 0),
    COUNT(*)
  INTO v_total_cost, v_total_tokens, v_total_requests
  FROM ai_usage
  WHERE created_at >= v_date_start AND created_at < v_date_end;

  -- Aggregate by model
  SELECT COALESCE(jsonb_object_agg(model, stats), '{}')
  INTO v_by_model
  FROM (
    SELECT model, jsonb_build_object(
      'cost_cents', SUM(estimated_cost_cents),
      'tokens', SUM(total_tokens),
      'requests', COUNT(*)
    ) as stats
    FROM ai_usage
    WHERE created_at >= v_date_start AND created_at < v_date_end
    GROUP BY model
  ) sub;

  -- Aggregate by persona
  SELECT COALESCE(jsonb_object_agg(persona_id::text, stats), '{}')
  INTO v_by_persona
  FROM (
    SELECT persona_id, jsonb_build_object(
      'cost_cents', SUM(estimated_cost_cents),
      'tokens', SUM(total_tokens),
      'requests', COUNT(*)
    ) as stats
    FROM ai_usage
    WHERE created_at >= v_date_start
      AND created_at < v_date_end
      AND persona_id IS NOT NULL
    GROUP BY persona_id
  ) sub;

  -- Aggregate by user (top 50 users)
  SELECT COALESCE(jsonb_object_agg(user_id::text, stats), '{}')
  INTO v_by_user
  FROM (
    SELECT user_id, jsonb_build_object(
      'cost_cents', SUM(estimated_cost_cents),
      'tokens', SUM(total_tokens),
      'requests', COUNT(*)
    ) as stats
    FROM ai_usage
    WHERE created_at >= v_date_start
      AND created_at < v_date_end
      AND user_id IS NOT NULL
    GROUP BY user_id
    ORDER BY SUM(estimated_cost_cents) DESC
    LIMIT 50
  ) sub;

  -- Insert or update snapshot
  INSERT INTO ai_cost_snapshots (
    snapshot_date,
    total_cost_cents,
    total_tokens,
    total_requests,
    cost_by_model,
    cost_by_persona,
    cost_by_user
  ) VALUES (
    p_date,
    v_total_cost,
    v_total_tokens,
    v_total_requests,
    v_by_model,
    v_by_persona,
    v_by_user
  )
  ON CONFLICT (snapshot_date) DO UPDATE SET
    total_cost_cents = EXCLUDED.total_cost_cents,
    total_tokens = EXCLUDED.total_tokens,
    total_requests = EXCLUDED.total_requests,
    cost_by_model = EXCLUDED.cost_by_model,
    cost_by_persona = EXCLUDED.cost_by_persona,
    cost_by_user = EXCLUDED.cost_by_user;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_daily_cost_snapshot IS 'Creates a daily aggregate snapshot of AI costs';

-- =============================================================================
-- 7. BACKFILL HISTORICAL SNAPSHOTS (last 90 days)
-- =============================================================================

DO $$
DECLARE
  d DATE;
BEGIN
  FOR d IN SELECT generate_series(CURRENT_DATE - 90, CURRENT_DATE - 1, '1 day'::interval)::date
  LOOP
    PERFORM create_daily_cost_snapshot(d);
  END LOOP;
END $$;

-- =============================================================================
-- 8. SEED DEFAULT BUDGET
-- =============================================================================

INSERT INTO ai_budgets (name, budget_type, limit_cents, alert_threshold_percent)
VALUES ('Monthly AI Budget', 'monthly', 50000, 80)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 9. HELPER FUNCTION: GET CURRENT PERIOD SPEND
-- =============================================================================

CREATE OR REPLACE FUNCTION get_budget_current_spend(p_budget_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_budget RECORD;
  v_spend INTEGER;
  v_period_start TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_budget FROM ai_budgets WHERE id = p_budget_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate period start based on budget type
  CASE v_budget.budget_type
    WHEN 'daily' THEN
      v_period_start := date_trunc('day', NOW());
    WHEN 'weekly' THEN
      v_period_start := date_trunc('week', NOW());
    WHEN 'monthly' THEN
      v_period_start := date_trunc('month', NOW());
    WHEN 'total' THEN
      v_period_start := '2020-01-01'::TIMESTAMPTZ;
  END CASE;

  -- Sum up costs for the period
  SELECT COALESCE(SUM(estimated_cost_cents), 0)
  INTO v_spend
  FROM ai_usage
  WHERE created_at >= v_period_start;

  RETURN v_spend;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_budget_current_spend IS 'Gets current spend for a budget based on its period type';

-- =============================================================================
-- 10. TRIGGER TO UPDATE BUDGET ON USAGE INSERT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_budget_on_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all active budgets with the new cost
  UPDATE ai_budgets
  SET
    current_spend_cents = get_budget_current_spend(id),
    updated_at = NOW()
  WHERE is_active = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists to allow re-running)
DROP TRIGGER IF EXISTS trigger_update_budget_on_usage ON ai_usage;

CREATE TRIGGER trigger_update_budget_on_usage
  AFTER INSERT ON ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_on_usage();

-- Initialize current spend for existing budgets
UPDATE ai_budgets
SET current_spend_cents = get_budget_current_spend(id)
WHERE is_active = true;
