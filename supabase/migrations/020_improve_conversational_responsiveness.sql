-- Migration: Improve Challenger Conversational Responsiveness
-- Updates AI settings to enforce shorter, more natural responses that follow user's lead

-- Update AI Response Style to enforce concise responses
UPDATE app_settings
SET value = '{
  "brevity": "conversational",
  "max_sentences": 3,
  "include_questions": true,
  "tone": "warm_professional"
}'::jsonb,
    updated_at = NOW()
WHERE key = 'ai_response_style';

-- Update AI System Modifiers with stronger brevity instruction
UPDATE app_settings
SET value = '{
  "brevity_instruction": "Write like texting - short, punchy, natural. NO LECTURES.",
  "safety_instruction": "Never provide harmful, dangerous, or unethical advice.",
  "persona_adherence": "Stay in character naturally, not performatively."
}'::jsonb,
    updated_at = NOW()
WHERE key = 'ai_system_modifiers';
