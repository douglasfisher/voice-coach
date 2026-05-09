-- ============================================================================
-- Migration 081: Trait token reconciliation in persona generator.
--
-- The system_prompt user_template previously asked the AI to embed 6 token
-- placeholders, 4 of which (vocabulary_complexity, emotional_tone,
-- response_pacing, cultural_context) DON'T EXIST in the runtime
-- TRAIT_TOKENS list. Result: generated personas leaked raw {{token}} text
-- into their system prompt at chat time because nothing replaced them.
--
-- This migration replaces those 6 with 6 of the 12 real tokens
-- (character_demeanor, conversation_register, directness,
-- emotional_attunement, challenge_intensity, coaching_method) — all
-- defined in trait_categories with prompt_modifier values, and all already
-- substituted by ai-config-resolver.ts at chat time.
--
-- Cleaned up the leakage at the same time: the rest of the template is
-- byte-for-byte identical to migration 078 with only the embed list
-- changed.
-- ============================================================================

UPDATE app_settings
SET value = jsonb_set(
  value::jsonb,
  '{system_prompt,user_template}',
  to_jsonb($tpl$Create a system prompt for an AI coaching persona with these characteristics:

Name: {{name|or 'Unknown'}}
Tagline: {{tagline|or 'None'}}
Cultural Background: {{cultural_background|or 'None'}}
Type: {{persona_type}}
Coaching Style: {{coaching_style|or 'Not set'}}
Challenge Style: {{challenge_style}}
Feedback Style: {{feedback_style}}
Personality: Warmth {{warmth}}/100, Directness {{directness}}/100, Patience {{patience}}/100, Humor {{humor}}/100, Formality {{formality}}/100
Avatar: {{age_range}} {{ethnicity}} {{gender}}, {{expression}}

Write a detailed system prompt (200-400 words) that:
1. Establishes the persona's voice and communication style
2. Defines how they coach/challenge users
3. Sets boundaries and personality traits
4. Includes these trait token placeholders where appropriate: {{character_demeanor}}, {{conversation_register}}, {{directness}}, {{emotional_attunement}}, {{challenge_intensity}}, {{coaching_method}}

Return ONLY the system prompt text, no explanation or markdown.$tpl$::text)
),
    updated_at = now()
WHERE key = 'ai_persona_generator';
