-- ============================================================================
-- Migration 078: AI persona generator config (DB-driven prompts).
--
-- Stores the meta-prompts that produce a full persona via AI. Web admin
-- reads from this row; mobile app will be migrated in a follow-up to do
-- the same. The prompt text below is extracted VERBATIM from
-- feature/prompt-splitting:stores/wizardStore.ts so the two clients
-- generate identical output today and stay in lockstep going forward.
--
-- Templating uses {{token}} placeholders. The server-side renderer
-- supports an `or` fallback: {{name|or 'Unknown'}} mirrors mobile's
-- `formData.name || 'Unknown'` patterns.
--
-- Known carry-over inconsistency (NOT fixed here, captured as follow-up):
-- the system_prompt template references trait tokens
-- vocabulary_complexity / emotional_tone / response_pacing /
-- cultural_context which are NOT in the runtime TRAIT_TOKENS list.
-- We preserve mobile's exact wording so behaviour is identical;
-- reconciling the two lists is a separate slice.
-- ============================================================================

INSERT INTO app_settings (key, value, description)
VALUES (
  'ai_persona_generator',
  jsonb_build_object(
    'model_settings', jsonb_build_object(
      'temperature', 0.9,
      'max_completion_tokens', 1024
    ),
    'details', jsonb_build_object(
      'system',
      'You are a creative character designer for a coaching app. Return only valid JSON.',
      'user_template',
      'Based on this avatar description, generate persona details for a coaching app character.

Avatar: {{age_range}} {{ethnicity}} {{gender}}, {{expression}}, wearing {{clothing}} attire, {{accessories}}.

Generate a JSON object with these fields:
- name: A culturally appropriate full name (first + last)
- tagline: A short catchy tagline (5-8 words) describing their coaching style
- cultural_background: A brief cultural/professional background (e.g., "Japanese-American, Executive Coach")
- coaching_style: One of: supportive_guide, tough_love, playful_mentor, expert_advisor, confidence_builder
- challenge_style: One of: socratic, devils_advocate, steelman, empathetic_probe, logical_surgeon, perspective_shifter
- warmth: number 0-100
- directness: number 0-100
- patience: number 0-100
- humor: number 0-100
- formality: number 0-100

Return ONLY valid JSON, no markdown or explanation.'
    ),
    'system_prompt', jsonb_build_object(
      'system',
      'You are an expert prompt engineer designing AI coaching personas. Write natural, engaging system prompts.',
      'user_template',
      'Create a system prompt for an AI coaching persona with these characteristics:

Name: {{name|or ''Unknown''}}
Tagline: {{tagline|or ''None''}}
Cultural Background: {{cultural_background|or ''None''}}
Type: {{persona_type}}
Coaching Style: {{coaching_style|or ''Not set''}}
Challenge Style: {{challenge_style}}
Feedback Style: {{feedback_style}}
Personality: Warmth {{warmth}}/100, Directness {{directness}}/100, Patience {{patience}}/100, Humor {{humor}}/100, Formality {{formality}}/100
Avatar: {{age_range}} {{ethnicity}} {{gender}}, {{expression}}

Write a detailed system prompt (200-400 words) that:
1. Establishes the persona''s voice and communication style
2. Defines how they coach/challenge users
3. Sets boundaries and personality traits
4. Includes these trait token placeholders where appropriate: {{character_demeanor}}, {{conversation_register}}, {{vocabulary_complexity}}, {{emotional_tone}}, {{response_pacing}}, {{cultural_context}}

Return ONLY the system prompt text, no explanation or markdown.'
    ),
    'sections', jsonb_build_object(
      '_system',
      'You are an expert prompt engineer designing AI coaching personas. Write natural, engaging system prompt sections.',
      'identity',
      'Write an opening identity paragraph for this AI coaching persona. Start with "You are [Name], a [role]..." and establish who they are, their background, and their approach. 2-4 sentences.

Persona:
{{persona_context}}

Return ONLY the paragraph, no explanation.',
      'character_traits',
      'Write a CHARACTER TRAITS section for this AI coaching persona. Start with "CHARACTER TRAITS:" on its own line, then include the placeholder {{character_demeanor}} on its own line, followed by 4-6 bullet points describing specific character traits. Each bullet should be one concise sentence.

Persona:
{{persona_context}}

Return ONLY the section text, no explanation.',
      'roleplay_behavior',
      'Write a "WHEN IN ROLEPLAY:" section for this AI coaching persona. Start with "WHEN IN ROLEPLAY:" on its own line, then 5-7 bullet points describing specific roleplay behaviors and rules. Each bullet should be one concise directive.

Persona:
{{persona_context}}

Return ONLY the section text, no explanation.',
      'coaching_approach',
      'Write a "COACHING APPROACH:" section for this AI coaching persona. Start with "COACHING APPROACH:" on its own line, then 4-6 bullet points describing specific coaching methods and philosophy. Each bullet should be one concise sentence.

Persona:
{{persona_context}}

Return ONLY the section text, no explanation.'
    ),
    'persona_context_template',
    'Name: {{name|or ''Unknown''}}
Tagline: {{tagline|or ''None''}}
Cultural Background: {{cultural_background|or ''None''}}
Type: {{persona_type}}
Coaching Style: {{coaching_style|or ''Not set''}}
Challenge Style: {{challenge_style}}
Feedback Style: {{feedback_style}}
Personality: Warmth {{warmth}}/100, Directness {{directness}}/100, Patience {{patience}}/100, Humor {{humor}}/100, Formality {{formality}}/100
Avatar: {{age_range}} {{ethnicity}} {{gender}}, {{expression}}'
  ),
  'AI persona generation meta-prompts. Mobile-parity: extracted verbatim from stores/wizardStore.ts. Editable in /admin/ai-config/persona-generator.'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();
