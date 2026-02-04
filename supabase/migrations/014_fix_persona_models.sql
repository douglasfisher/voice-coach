-- Fix persona models - use llama-3.3-70b-versatile as primary (known to work)
-- with llama-3.1-8b-instant as fallback

UPDATE public.personas
SET ai_config = jsonb_build_object(
  'model', 'llama-3.3-70b-versatile',
  'fallback_model', 'llama-3.1-8b-instant',
  'temperature', COALESCE((ai_config->>'temperature')::numeric, 0.7),
  'top_p', COALESCE((ai_config->>'top_p')::numeric, 0.9),
  'max_completion_tokens', COALESCE((ai_config->>'max_completion_tokens')::integer, 1024)
)
WHERE ai_config IS NOT NULL;

-- Also fix any null ai_config
UPDATE public.personas
SET ai_config = jsonb_build_object(
  'model', 'llama-3.3-70b-versatile',
  'fallback_model', 'llama-3.1-8b-instant',
  'temperature', 0.7,
  'top_p', 0.9,
  'max_completion_tokens', 1024
)
WHERE ai_config IS NULL;
