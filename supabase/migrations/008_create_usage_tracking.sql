-- AI Usage Tracking Table
-- Tracks token usage and costs for all AI interactions

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,

  -- Request details
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking (in USD cents for precision)
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_persona_id ON public.ai_usage(persona_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON public.ai_usage(model, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Admins can read all usage data
CREATE POLICY "Admins can read all usage"
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Users can read their own usage
CREATE POLICY "Users can read own usage"
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role can insert (from edge functions)
CREATE POLICY "Service role can insert usage"
  ON public.ai_usage
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE public.ai_usage IS 'Tracks token usage and costs for all AI interactions';
COMMENT ON COLUMN public.ai_usage.estimated_cost_cents IS 'Estimated cost in USD cents based on model pricing';
