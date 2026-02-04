-- Add fallback_model to persona ai_config
-- This provides a backup model if the primary fails

-- Update all personas to have a fallback model
UPDATE public.personas
SET ai_config = ai_config || '{"fallback_model": "llama-3.1-8b-instant"}'::jsonb
WHERE ai_config IS NOT NULL
  AND ai_config->>'fallback_model' IS NULL;

-- Also update the default model to a known working one for all personas
UPDATE public.personas
SET ai_config = jsonb_set(
  ai_config,
  '{model}',
  '"llama-3.1-8b-instant"'::jsonb
)
WHERE ai_config IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.personas.ai_config IS 'JSON configuration for AI model settings: model, fallback_model, temperature, top_p, max_completion_tokens, stop sequences, costs, etc.';
