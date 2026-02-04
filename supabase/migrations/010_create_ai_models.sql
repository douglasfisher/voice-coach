-- Create ai_models table for storing available AI models
-- Models are fetched from Groq API and cached here

CREATE TABLE IF NOT EXISTS public.ai_models (
  id TEXT PRIMARY KEY,                    -- Model ID (e.g., 'llama-3.3-70b-versatile')
  name TEXT NOT NULL,                     -- Human-readable name
  provider TEXT NOT NULL DEFAULT 'groq',  -- Provider (groq, openai, etc.)
  context_window INTEGER,                 -- Max context window size
  active BOOLEAN NOT NULL DEFAULT true,   -- Whether model is currently available
  owned_by TEXT,                          -- Model owner/creator
  cost_per_million_input INTEGER DEFAULT 0,   -- Cost in cents per 1M input tokens
  cost_per_million_output INTEGER DEFAULT 0,  -- Cost in cents per 1M output tokens
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Anyone can read models
CREATE POLICY "Anyone can read ai_models"
  ON public.ai_models FOR SELECT
  USING (true);

-- Only admins can modify models
CREATE POLICY "Admins can manage ai_models"
  ON public.ai_models FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Seed with current known Groq models
INSERT INTO public.ai_models (id, name, provider, context_window, cost_per_million_input, cost_per_million_output) VALUES
  ('llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile', 'groq', 128000, 59, 79),
  ('llama-3.1-70b-versatile', 'Llama 3.1 70B Versatile', 'groq', 128000, 59, 79),
  ('llama-3.1-8b-instant', 'Llama 3.1 8B Instant', 'groq', 128000, 5, 8),
  ('llama3-70b-8192', 'Llama 3 70B', 'groq', 8192, 59, 79),
  ('llama3-8b-8192', 'Llama 3 8B', 'groq', 8192, 5, 8),
  ('mixtral-8x7b-32768', 'Mixtral 8x7B', 'groq', 32768, 24, 24),
  ('gemma2-9b-it', 'Gemma 2 9B IT', 'groq', 8192, 20, 20),
  ('gemma-7b-it', 'Gemma 7B IT', 'groq', 8192, 7, 7)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  context_window = EXCLUDED.context_window,
  cost_per_million_input = EXCLUDED.cost_per_million_input,
  cost_per_million_output = EXCLUDED.cost_per_million_output,
  updated_at = NOW();

-- Add index for active models
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON public.ai_models(active) WHERE active = true;
