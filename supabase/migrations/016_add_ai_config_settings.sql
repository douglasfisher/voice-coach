-- Migration: Add AI configuration settings for database-driven AI behavior
-- This enables changing AI behavior without redeploying edge functions

-- AI Default Settings (global model parameters)
INSERT INTO app_settings (key, value, description) VALUES
  ('ai_default_settings', '{
    "temperature": 0.7,
    "top_p": 0.9,
    "max_completion_tokens": 512,
    "presence_penalty": 0,
    "frequency_penalty": 0
  }', 'Default AI model parameters when not specified per-persona')
ON CONFLICT (key) DO NOTHING;

-- AI Response Style (controls response behavior)
INSERT INTO app_settings (key, value, description) VALUES
  ('ai_response_style', '{
    "brevity": "conversational",
    "max_sentences": 3,
    "include_questions": true,
    "tone": "warm_professional"
  }', 'Global AI response style configuration')
ON CONFLICT (key) DO NOTHING;

-- AI System Modifiers (prepended to all persona prompts)
INSERT INTO app_settings (key, value, description) VALUES
  ('ai_system_modifiers', '{
    "brevity_instruction": "Keep responses concise (2-3 sentences max). Be conversational like texting. End with ONE thought-provoking question.",
    "safety_instruction": "Never provide harmful, dangerous, or unethical advice.",
    "persona_adherence": "Stay in character at all times. Your personality should shine through in every response."
  }', 'System prompt modifiers applied to all AI interactions')
ON CONFLICT (key) DO NOTHING;

-- AI Task Settings (per-task overrides)
INSERT INTO app_settings (key, value, description) VALUES
  ('ai_task_settings', '{
    "chat": {
      "max_completion_tokens": 150,
      "temperature": null
    },
    "analysis": {
      "max_completion_tokens": 1024,
      "temperature": 0.3
    },
    "report": {
      "max_completion_tokens": 2000,
      "temperature": 0.3
    }
  }', 'Per-task AI settings overrides (null means use default)')
ON CONFLICT (key) DO NOTHING;

-- AI Features (feature toggles)
INSERT INTO app_settings (key, value, description) VALUES
  ('ai_features', '{
    "analysis_enabled": true,
    "report_generation_enabled": true,
    "streaming_enabled": false
  }', 'AI feature toggles')
ON CONFLICT (key) DO NOTHING;

-- AI Rate Limits
INSERT INTO app_settings (key, value, description) VALUES
  ('ai_rate_limits', '{
    "max_messages_per_conversation": 50,
    "max_conversations_per_day_free": 10,
    "max_conversations_per_day_premium": 100,
    "cooldown_seconds_between_messages": 1
  }', 'AI rate limiting configuration')
ON CONFLICT (key) DO NOTHING;
