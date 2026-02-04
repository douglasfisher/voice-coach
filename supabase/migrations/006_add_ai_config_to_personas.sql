-- Add AI configuration column to personas table
-- This allows full control over model settings per persona

ALTER TABLE public.personas
ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT '{
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.7,
  "top_p": 0.9,
  "max_completion_tokens": 1024
}'::jsonb;

-- Update existing personas with appropriate AI configs based on their challenge style

-- Socratic personas (Dr. Raj Patel, Father Thomas O'Brien) - balanced, patient
UPDATE public.personas
SET ai_config = '{
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.7,
  "top_p": 0.9,
  "max_completion_tokens": 1024
}'::jsonb
WHERE challenge_style = 'socratic';

-- Devil's Advocate (Marcus Webb, Yuki Tanaka) - more analytical
UPDATE public.personas
SET ai_config = '{
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.5,
  "top_p": 0.85,
  "max_completion_tokens": 1024
}'::jsonb
WHERE challenge_style = 'devils_advocate';

-- Steelman (Sarah Mitchell) - balanced
UPDATE public.personas
SET ai_config = '{
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.7,
  "top_p": 0.9,
  "max_completion_tokens": 1024
}'::jsonb
WHERE challenge_style = 'steelman';

-- Empathetic Probe (Dr. Maya Chen) - more creative/warm
UPDATE public.personas
SET ai_config = '{
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.8,
  "top_p": 0.95,
  "max_completion_tokens": 1024
}'::jsonb
WHERE challenge_style = 'empathetic_probe';

-- Logical Surgeon (Professor Elena Volkov) - precise
UPDATE public.personas
SET ai_config = '{
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.3,
  "top_p": 0.8,
  "max_completion_tokens": 1024
}'::jsonb
WHERE challenge_style = 'logical_surgeon';

-- Perspective Shifter (Kofi Asante) - creative
UPDATE public.personas
SET ai_config = '{
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.85,
  "top_p": 0.95,
  "max_completion_tokens": 1024
}'::jsonb
WHERE challenge_style = 'perspective_shifter';

-- Add comment for documentation
COMMENT ON COLUMN public.personas.ai_config IS 'JSON configuration for AI model settings: model, temperature, top_p, max_completion_tokens, stop sequences, etc.';
