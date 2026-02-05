-- Migration: Fix Conversational Rules (database-only approach)
-- Puts all conversational rules in brevity_instruction where they belong

UPDATE app_settings
SET value = '{
  "brevity_instruction": "CONVERSATION RULES (CRITICAL):\n- Keep responses to 3 sentences maximum\n- RESPOND TO WHAT THEY JUST SAID - their last message is what matters\n- FOLLOW THEIR LEAD - if they change topics, go with them\n- End with ONE follow-up question maximum (sometimes none is fine)\n- Match their energy and length - no speeches\n\nWrite like texting - short, punchy, natural. NO LECTURES.",
  "safety_instruction": "Never provide harmful, dangerous, or unethical advice.",
  "persona_adherence": "Stay in character naturally, not performatively."
}'::jsonb,
    updated_at = NOW()
WHERE key = 'ai_system_modifiers';
