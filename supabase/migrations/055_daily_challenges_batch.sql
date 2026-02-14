-- Migration 055: Daily Challenges Batch
-- Adds batch storage for 10 daily challenges (same for all users)
-- Adds admin toggle for showing persona images on challenge cards

-- Batch storage: { challenges: [...], generatedAt, generatedDate }
INSERT INTO app_settings (key, value, description) VALUES
  ('daily_challenges_batch', '{"challenges":[],"generatedAt":null,"generatedDate":null}',
   'Current batch of daily challenges (regenerated daily)'),
  ('challenge_show_persona_image', 'true',
   'Show persona avatar on daily challenge cards')
ON CONFLICT (key) DO NOTHING;

-- Increase challenge token limit for batch generation (10 challenges = ~1500 tokens)
UPDATE app_settings
SET value = jsonb_set(value::jsonb, '{challenge,max_completion_tokens}', '1500')
WHERE key = 'ai_task_settings';

-- Update challenge prompt to generate 10 at once
UPDATE app_settings
SET value = to_jsonb(
  'You are a generator of thought-provoking questions for a coaching app. Generate exactly 10 unique, engaging questions that challenge assumptions and spark deep thinking. Each question should feel distinct in topic and style. IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanations. Output format: {"challenges":[{"question":"Your thought-provoking question here?","topic":"Brief topic label (2-3 words)"},...]}'::text
)
WHERE key = 'ai_challenge_prompt';
