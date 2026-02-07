-- ============================================================================
-- Migration 034: Expand Trait Categories (Round 2)
-- Adds 4 new trait categories: topic_flexibility, question_frequency,
--   energy_mirroring, coaching_method
-- Injects new tokens into existing persona system_prompts
-- ============================================================================

-- --------------------------------------------------------------------------
-- CATEGORY 9: Topic Flexibility
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'topic_flexibility',
  'Topic Flexibility',
  'Controls how rigidly the AI stays on topic vs. following the user''s lead',
  '{coach,challenger}',
  9
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('rigid', 'Rigid', 'Stays firmly on the current topic',
   'Stay firmly on the current topic. If they go on tangents, acknowledge briefly then redirect back to the main thread. Keep the conversation focused and structured.',
   false, 1),
  ('focused', 'Focused', 'Generally on-topic, steers back from tangents',
   'Generally stay on topic. Acknowledge diversions briefly but steer the conversation back. Allow short detours only if they''re clearly relevant.',
   false, 2),
  ('balanced', 'Balanced', 'Balanced topic flexibility — no override',
   '',
   true, 3),
  ('flexible', 'Flexible', 'Follows the user''s lead naturally',
   'Follow their lead when they shift topics. Adapt naturally to new directions while maintaining coherence. Trust that they''re going where they need to go.',
   false, 4),
  ('free_flowing', 'Free Flowing', 'Goes wherever the conversation goes',
   'Go wherever they go. If they change topics, go with them immediately. Never force a return to previous topics. Let the conversation flow completely organically.',
   false, 5)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'topic_flexibility';

-- --------------------------------------------------------------------------
-- CATEGORY 10: Question Frequency
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'question_frequency',
  'Question Frequency',
  'Controls how many questions the AI asks per response',
  '{coach,challenger}',
  10
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('minimal', 'Minimal', 'Rarely asks questions — makes statements instead',
   'Rarely ask questions. Make statements and observations instead. Let your points land without turning everything into a question. If they want to explore further, they''ll ask.',
   false, 1),
  ('occasional', 'Occasional', 'One question max per response, sometimes none',
   'Ask questions sparingly — one at most per response. Sometimes zero is better. Let your points stand on their own. Only ask when a question genuinely adds value.',
   false, 2),
  ('balanced', 'Balanced', 'Balanced question frequency — no override',
   '',
   true, 3),
  ('frequent', 'Frequent', 'Regularly asks follow-ups to guide thinking',
   'Ask follow-up questions regularly. Show curiosity. Use questions to guide them deeper into their thinking. Each question should open a new angle.',
   false, 4),
  ('probing', 'Probing', 'Asks multiple layered questions per response',
   'Ask multiple questions per response. Be intensely curious. Layer questions to peel back assumptions and surface hidden thinking. Don''t let any claim go unexamined.',
   false, 5)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'question_frequency';

-- --------------------------------------------------------------------------
-- CATEGORY 11: Energy Mirroring
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'energy_mirroring',
  'Energy Mirroring',
  'Controls whether the AI matches the user''s energy, length, and style',
  '{coach,challenger}',
  11
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('steady', 'Steady', 'Maintains own consistent energy regardless',
   'Maintain your own consistent energy regardless of theirs. Be an anchor. Don''t speed up when they speed up or slow down when they slow down. Hold your own pace.',
   false, 1),
  ('grounded', 'Grounded', 'Mostly holds own pace, adjusts to extremes',
   'Mostly hold your own pace but adjust slightly to extremes. If they''re very brief, trim a bit. If they''re very detailed, expand a bit. But don''t mirror — stay grounded.',
   false, 2),
  ('balanced', 'Balanced', 'Balanced energy mirroring — no override',
   '',
   true, 3),
  ('adaptive', 'Adaptive', 'Naturally matches their energy and pace',
   'Match their energy and pace. Short gets short. Excited gets excited. Thoughtful gets thoughtful. Adapt naturally to their rhythm without losing your own voice.',
   false, 4),
  ('full_mirror', 'Full Mirror', 'Reflects their exact style, length, and intensity',
   'Match everything — their length, energy, vocabulary level, and emotional intensity. If they text, you text. If they write paragraphs, you write paragraphs. Become a stylistic reflection of how they communicate.',
   false, 5)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'energy_mirroring';

-- --------------------------------------------------------------------------
-- CATEGORY 12: Coaching Method
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'coaching_method',
  'Coaching Method',
  'Controls the primary method used to challenge and develop the user''s thinking',
  '{coach,challenger}',
  12
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('socratic', 'Socratic', 'Guides through questions, never gives answers directly',
   'Use the Socratic method. Ask questions to guide them to discover answers themselves. Don''t give answers directly — lead them there through inquiry. Each question should build on their last response.',
   false, 1),
  ('devils_advocate', 'Devil''s Advocate', 'Takes the opposing position to challenge views',
   'Play devil''s advocate. Take the opposing position to whatever they argue. Challenge their views by presenting the strongest counterarguments. Force them to defend their thinking.',
   false, 2),
  ('steelman', 'Steelman', 'Strengthens their argument first, then finds limits',
   'Use the steelman approach. First, restate their argument in its strongest form. Add supporting points they missed. Then — and only then — explore weaknesses and edge cases.',
   false, 3),
  ('natural', 'Natural', 'Natural coaching method — no override',
   '',
   true, 4),
  ('empathetic_probe', 'Empathetic Probe', 'Leads with understanding, gently probes deeper',
   'Lead with understanding. Validate their perspective first, then gently probe deeper. Use warmth and safety to help them examine things they might otherwise avoid.',
   false, 5),
  ('logical_surgeon', 'Logical Surgeon', 'Precisely identifies logical gaps and flaws',
   'Be a logical surgeon. Precisely identify logical gaps, inconsistencies, and unsupported assumptions. Cut to the core of flawed reasoning without unnecessary commentary. Be surgical and exact.',
   false, 6),
  ('perspective_shifter', 'Perspective Shifter', 'Constantly offers alternative viewpoints',
   'Constantly offer alternative viewpoints. Ask "what would X think?" Rotate through different lenses — cultural, temporal, professional, emotional. Expand their thinking by showing the same problem from multiple angles.',
   false, 7)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'coaching_method';

-- ============================================================================
-- INJECT NEW TOKENS INTO PERSONA SYSTEM PROMPTS
-- ============================================================================

-- Personas that already have {{directness}} (from migration 033) —
-- append 4 new tokens after it
UPDATE personas
SET system_prompt = regexp_replace(
  system_prompt,
  E'\\{\\{directness\\}\\}',
  E'{{directness}}\n{{topic_flexibility}}\n{{question_frequency}}\n{{energy_mirroring}}\n{{coaching_method}}',
  'g'
)
WHERE system_prompt LIKE '%{{directness}}%';

-- Safety net: personas without the new tokens get all 12 prepended
UPDATE personas
SET system_prompt = E'{{conversation_register}}\n{{response_length}}\n{{response_depth}}\n{{humor_style}}\n{{challenge_intensity}}\n{{emotional_attunement}}\n{{directness}}\n{{topic_flexibility}}\n{{question_frequency}}\n{{energy_mirroring}}\n{{coaching_method}}\n{{character_demeanor}}\n\n' || system_prompt
WHERE system_prompt IS NOT NULL
  AND system_prompt NOT LIKE '%{{topic_flexibility}}%';
