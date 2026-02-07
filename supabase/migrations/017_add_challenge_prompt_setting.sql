-- Add configurable challenge prompt setting
INSERT INTO app_settings (key, value, description)
VALUES (
  'ai_challenge_prompt',
  '"You are a generator of thought-provoking philosophical and ethical questions. Generate ONE unique, engaging question that will challenge someones assumptions and spark deep thinking. IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations. Output format: {\"question\": \"Your thought-provoking question here?\", \"topic\": \"Brief topic label (2-3 words)\"} Guidelines: Questions should be open-ended, not yes/no. Focus on ethics, philosophy, psychology, society, or personal growth. Make it personally relevant. Avoid academic jargon. The question should have no single right answer."'::jsonb,
  'System prompt for generating daily challenge questions'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Add challenge task settings
UPDATE app_settings
SET value = jsonb_set(
  value::jsonb,
  '{challenge}',
  '{"max_completion_tokens": 150, "temperature": 0.9}'::jsonb
)
WHERE key = 'ai_task_settings';
