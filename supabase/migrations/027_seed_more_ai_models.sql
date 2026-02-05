-- Seed additional Groq models with current pricing
-- Source: https://groq.com/pricing/ (February 2025)

INSERT INTO public.ai_models (id, name, provider, context_window, cost_per_million_input, cost_per_million_output, active) VALUES
  -- Llama 3.3 models
  ('llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile', 'groq', 128000, 59, 79, true),
  ('llama-3.3-70b-specdec', 'Llama 3.3 70B SpecDec', 'groq', 8192, 59, 99, true),

  -- Llama 3.2 models
  ('llama-3.2-1b-preview', 'Llama 3.2 1B Preview', 'groq', 128000, 4, 4, true),
  ('llama-3.2-3b-preview', 'Llama 3.2 3B Preview', 'groq', 128000, 6, 6, true),
  ('llama-3.2-11b-vision-preview', 'Llama 3.2 11B Vision Preview', 'groq', 128000, 18, 18, true),
  ('llama-3.2-90b-vision-preview', 'Llama 3.2 90B Vision Preview', 'groq', 128000, 90, 90, true),

  -- Llama 3.1 models
  ('llama-3.1-70b-versatile', 'Llama 3.1 70B Versatile', 'groq', 128000, 59, 79, true),
  ('llama-3.1-8b-instant', 'Llama 3.1 8B Instant', 'groq', 128000, 5, 8, true),

  -- Llama 3 models (legacy)
  ('llama3-70b-8192', 'Llama 3 70B', 'groq', 8192, 59, 79, true),
  ('llama3-8b-8192', 'Llama 3 8B', 'groq', 8192, 5, 8, true),

  -- Mixtral models
  ('mixtral-8x7b-32768', 'Mixtral 8x7B', 'groq', 32768, 24, 24, true),

  -- Gemma models
  ('gemma2-9b-it', 'Gemma 2 9B IT', 'groq', 8192, 20, 20, true),
  ('gemma-7b-it', 'Gemma 7B IT', 'groq', 8192, 7, 7, true),

  -- Qwen models
  ('qwen-2.5-72b', 'Qwen 2.5 72B', 'groq', 128000, 59, 79, true),
  ('qwen-2.5-32b', 'Qwen 2.5 32B', 'groq', 128000, 29, 39, true),
  ('qwen-2.5-coder-32b', 'Qwen 2.5 Coder 32B', 'groq', 128000, 29, 39, true),
  ('qwen-qwq-32b', 'Qwen QwQ 32B', 'groq', 128000, 29, 39, true),

  -- DeepSeek models
  ('deepseek-r1-distill-llama-70b', 'DeepSeek R1 Distill Llama 70B', 'groq', 128000, 59, 79, true),
  ('deepseek-r1-distill-qwen-32b', 'DeepSeek R1 Distill Qwen 32B', 'groq', 128000, 29, 39, true),

  -- Llama Guard (for content moderation)
  ('llama-guard-3-8b', 'Llama Guard 3 8B', 'groq', 8192, 20, 20, true),

  -- Compound AI models
  ('compound-beta', 'Compound Beta', 'groq', 128000, 0, 0, true),
  ('compound-beta-mini', 'Compound Beta Mini', 'groq', 128000, 0, 0, true)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  context_window = EXCLUDED.context_window,
  cost_per_million_input = EXCLUDED.cost_per_million_input,
  cost_per_million_output = EXCLUDED.cost_per_million_output,
  active = EXCLUDED.active,
  updated_at = NOW();

-- Verify models were added
DO $$
DECLARE
  model_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO model_count FROM public.ai_models WHERE active = true;
  RAISE NOTICE 'Total active AI models: %', model_count;
END $$;
