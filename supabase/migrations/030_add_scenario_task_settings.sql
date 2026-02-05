-- Migration: Add 'scenario' task type to ai_task_settings
-- Used by scenario generation in Q&A mode (via /chat endpoint)

UPDATE app_settings
SET value = jsonb_set(
  value::jsonb,
  '{scenario}',
  '{"max_completion_tokens": 150, "temperature": 0.95}'
)
WHERE key = 'ai_task_settings';
