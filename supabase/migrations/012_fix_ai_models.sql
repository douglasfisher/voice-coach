-- Fix ai_models - ensure all known models are active
-- This fixes the issue where models were incorrectly marked inactive

-- Re-insert/update all known Groq models with active = true
INSERT INTO public.ai_models (id, name, provider, context_window, active, cost_per_million_input, cost_per_million_output, updated_at) VALUES
  ('llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile', 'groq', 128000, true, 59, 79, NOW()),
  ('llama-3.1-70b-versatile', 'Llama 3.1 70B Versatile', 'groq', 128000, true, 59, 79, NOW()),
  ('llama-3.1-8b-instant', 'Llama 3.1 8B Instant', 'groq', 128000, true, 5, 8, NOW()),
  ('llama3-70b-8192', 'Llama 3 70B', 'groq', 8192, true, 59, 79, NOW()),
  ('llama3-8b-8192', 'Llama 3 8B', 'groq', 8192, true, 5, 8, NOW()),
  ('mixtral-8x7b-32768', 'Mixtral 8x7B', 'groq', 32768, true, 24, 24, NOW()),
  ('gemma2-9b-it', 'Gemma 2 9B IT', 'groq', 8192, true, 20, 20, NOW()),
  ('gemma-7b-it', 'Gemma 7B IT', 'groq', 8192, true, 7, 7, NOW())
ON CONFLICT (id) DO UPDATE SET
  active = true,
  name = EXCLUDED.name,
  context_window = EXCLUDED.context_window,
  cost_per_million_input = EXCLUDED.cost_per_million_input,
  cost_per_million_output = EXCLUDED.cost_per_million_output,
  updated_at = NOW();
