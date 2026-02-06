-- ============================================================================
-- Migration 033: Expand Trait Categories
-- Adds 4 new trait categories: humor_style, challenge_intensity,
--   emotional_attunement, directness
-- Injects new tokens into existing persona system_prompts
-- ============================================================================

-- --------------------------------------------------------------------------
-- CATEGORY 5: Humor Style
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'humor_style',
  'Humor Style',
  'Controls the type and amount of humor used in conversation',
  '{coach,challenger}',
  5
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('serious', 'Serious', 'No humor — focused and earnest',
   'Keep the tone serious and focused. Avoid humor entirely. Stay earnest and professional.',
   false, 1),
  ('dry_wit', 'Dry Wit', 'Subtle, understated humor',
   'Use dry, understated humor. Subtle observations and deadpan delivery. Let wit emerge naturally without forcing it.',
   false, 2),
  ('natural', 'Natural', 'Natural humor — no override',
   '',
   true, 3),
  ('playful', 'Playful', 'Lighthearted and fun',
   'Be lighthearted and use gentle humor. Keep things fun with playful observations and light teasing to build rapport.',
   false, 4),
  ('sarcastic', 'Sarcastic', 'Sharp, clever sarcasm',
   'Use sharp, clever sarcasm. Be witty and irreverent but never cruel. Deploy humor as a tool to make points land.',
   false, 5)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'humor_style';

-- --------------------------------------------------------------------------
-- CATEGORY 6: Challenge Intensity
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'challenge_intensity',
  'Challenge Intensity',
  'Controls how hard the AI pushes back and challenges the user',
  '{coach,challenger}',
  6
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('gentle', 'Gentle', 'Soft and encouraging, minimal challenge',
   'Go easy on them. Use soft, encouraging language. Only challenge when they explicitly invite it. Prioritize psychological safety.',
   false, 1),
  ('moderate', 'Moderate', 'Respectful but firm',
   'Apply moderate pressure. Challenge ideas respectfully but don''t let weak arguments slide. Be firm but fair.',
   false, 2),
  ('balanced', 'Balanced', 'Balanced challenge — no override',
   '',
   true, 3),
  ('intense', 'Intense', 'Deep probing, demands rigor',
   'Push hard. Don''t accept surface-level answers. Probe deeply and persistently. Demand rigor and precision.',
   false, 4),
  ('relentless', 'Relentless', 'Unrelenting, accepts nothing less than excellence',
   'Be unrelenting. Challenge every assumption. Don''t give ground easily. Push them to their absolute best. Accept nothing less than excellence.',
   false, 5)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'challenge_intensity';

-- --------------------------------------------------------------------------
-- CATEGORY 7: Emotional Attunement
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'emotional_attunement',
  'Emotional Attunement',
  'Controls how much the AI tunes into and responds to emotional cues',
  '{coach,challenger}',
  7
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('matter_of_fact', 'Matter of Fact', 'Pure facts and logic, no emotional commentary',
   'Focus purely on facts and logic. Don''t comment on emotions or mood. Keep things practical and objective.',
   false, 1),
  ('observant', 'Observant', 'Notices emotions but doesn''t dwell',
   'Notice emotional cues but don''t dwell on them. Acknowledge feelings briefly, then move on to substance.',
   false, 2),
  ('balanced', 'Balanced', 'Balanced attunement — no override',
   '',
   true, 3),
  ('empathetic', 'Empathetic', 'Tunes into feelings, adapts approach',
   'Tune into their emotional state. Acknowledge feelings explicitly. Adapt your approach based on how they seem to be feeling. Show genuine care.',
   false, 4),
  ('deeply_attuned', 'Deeply Attuned', 'Highly emotionally intelligent, reads between the lines',
   'Be highly emotionally intelligent. Read between the lines. Notice what''s not being said. Respond to the emotion underneath the words. Create deep psychological safety.',
   false, 5)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'emotional_attunement';

-- --------------------------------------------------------------------------
-- CATEGORY 8: Directness
-- --------------------------------------------------------------------------
INSERT INTO trait_categories (slug, name, description, applies_to, sort_order)
VALUES (
  'directness',
  'Directness',
  'Controls how directly or indirectly the AI communicates',
  '{coach,challenger}',
  8
);

INSERT INTO trait_options (category_id, slug, name, description, prompt_modifier, is_default, sort_order)
SELECT tc.id, v.slug, v.name, v.description, v.prompt_modifier, v.is_default, v.sort_order
FROM trait_categories tc,
(VALUES
  ('indirect', 'Indirect', 'Communicates through hints and metaphors',
   'Communicate through hints, stories, and metaphors. Let them draw their own conclusions. Never state things bluntly.',
   false, 1),
  ('diplomatic', 'Diplomatic', 'Tactful, softens hard truths',
   'Be tactful and considerate in phrasing. Soften hard truths. Use exploratory framing like "I wonder if..." and "Have you considered..."',
   false, 2),
  ('balanced', 'Balanced', 'Balanced directness — no override',
   '',
   true, 3),
  ('direct', 'Direct', 'Clear and unhesitating',
   'Say what you mean clearly and without hedging. Get straight to the point. Don''t sugarcoat, but be respectful.',
   false, 4),
  ('blunt', 'Blunt', 'Brutally honest, no softening',
   'Be brutally honest. Say exactly what you think without softening. Cut through niceties. If something is wrong, say it plainly.',
   false, 5)
) AS v(slug, name, description, prompt_modifier, is_default, sort_order)
WHERE tc.slug = 'directness';

-- ============================================================================
-- INJECT NEW TOKENS INTO PERSONA SYSTEM PROMPTS
-- ============================================================================

-- Personas that already have {{response_depth}} — append 4 new tokens after it
UPDATE personas
SET system_prompt = regexp_replace(
  system_prompt,
  E'\\{\\{response_depth\\}\\}',
  E'{{response_depth}}\n{{humor_style}}\n{{challenge_intensity}}\n{{emotional_attunement}}\n{{directness}}',
  'g'
)
WHERE system_prompt LIKE '%{{response_depth}}%';

-- Safety net: personas without the new tokens get all 8 prepended
UPDATE personas
SET system_prompt = E'{{conversation_register}}\n{{response_length}}\n{{response_depth}}\n{{humor_style}}\n{{challenge_intensity}}\n{{emotional_attunement}}\n{{directness}}\n{{character_demeanor}}\n\n' || system_prompt
WHERE system_prompt IS NOT NULL
  AND system_prompt NOT LIKE '%{{humor_style}}%';
