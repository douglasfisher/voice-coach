-- Migration: Increase scenario max_completion_tokens from 150 to 300
-- Gives the model room for 2-3 vivid sentences instead of 1 short one

UPDATE app_settings
SET value = jsonb_set(
  value::jsonb,
  '{scenario,max_completion_tokens}',
  '300'
)
WHERE key = 'ai_task_settings';
