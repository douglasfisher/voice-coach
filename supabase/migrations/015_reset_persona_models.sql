-- Reset personas to use original working model configuration
UPDATE public.personas
SET ai_config = jsonb_build_object(
  'model', 'llama-3.3-70b-versatile',
  'temperature', COALESCE((ai_config->>'temperature')::numeric, 0.7),
  'top_p', COALESCE((ai_config->>'top_p')::numeric, 0.9),
  'max_completion_tokens', COALESCE((ai_config->>'max_completion_tokens')::integer, 1024)
);
