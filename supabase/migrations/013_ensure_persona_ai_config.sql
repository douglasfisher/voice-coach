-- Ensure all personas have valid ai_config
-- This fixes any personas that have null or incomplete ai_config

-- Update personas with null ai_config to have a default config
UPDATE public.personas
SET ai_config = jsonb_build_object(
  'model', 'llama-3.1-8b-instant',
  'fallback_model', 'llama-3.1-8b-instant',
  'temperature', 0.7,
  'top_p', 0.9,
  'max_completion_tokens', 1024,
  'cost_per_million_input', 5,
  'cost_per_million_output', 8
)
WHERE ai_config IS NULL;

-- Ensure all personas have the model field set
UPDATE public.personas
SET ai_config = ai_config || jsonb_build_object('model', 'llama-3.1-8b-instant')
WHERE ai_config IS NOT NULL
  AND (ai_config->>'model' IS NULL OR ai_config->>'model' = '');

-- Ensure all personas have the fallback_model field set
UPDATE public.personas
SET ai_config = ai_config || jsonb_build_object('fallback_model', 'llama-3.1-8b-instant')
WHERE ai_config IS NOT NULL
  AND (ai_config->>'fallback_model' IS NULL OR ai_config->>'fallback_model' = '');

-- Log the result
DO $$
DECLARE
  persona_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO persona_count FROM public.personas WHERE ai_config IS NOT NULL;
  RAISE NOTICE 'Updated % personas with valid ai_config', persona_count;
END $$;
