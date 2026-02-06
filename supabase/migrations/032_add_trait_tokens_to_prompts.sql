-- ============================================================================
-- Migration 032: Add Trait Tokens to All Persona System Prompts
-- Injects {{character_demeanor}}, {{conversation_register}},
--         {{response_length}}, {{response_depth}} tokens into system_prompts.
-- Tokens on their own lines so empty replacements don't leave gaps.
-- ============================================================================

-- --------------------------------------------------------------------------
-- COACHES: Insert tokens between identity line and CHARACTER TRAITS section
-- Pattern: after first paragraph, before "CHARACTER TRAITS:"
-- --------------------------------------------------------------------------
UPDATE personas
SET system_prompt = regexp_replace(
  system_prompt,
  E'(CHARACTER TRAITS:)',
  E'{{conversation_register}}\n{{response_length}}\n{{response_depth}}\n\n\\1\n{{character_demeanor}}',
  'g'
)
WHERE persona_type = 'coach'
  AND system_prompt LIKE '%CHARACTER TRAITS:%';

-- --------------------------------------------------------------------------
-- CHALLENGERS: Insert tokens between identity line and "Your style:" section
-- Pattern: after first paragraph, before "Your style:"
-- --------------------------------------------------------------------------
UPDATE personas
SET system_prompt = regexp_replace(
  system_prompt,
  E'(Your style:)',
  E'{{conversation_register}}\n{{response_length}}\n{{response_depth}}\n{{character_demeanor}}\n\n\\1',
  'g'
)
WHERE (persona_type = 'challenger' OR persona_type IS NULL)
  AND system_prompt LIKE '%Your style:%'
  AND system_prompt NOT LIKE '%{{conversation_register}}%';

-- --------------------------------------------------------------------------
-- SAFETY NET: Any persona that didn't match the above patterns
-- Prepend tokens to the very beginning of system_prompt
-- --------------------------------------------------------------------------
UPDATE personas
SET system_prompt = E'{{conversation_register}}\n{{response_length}}\n{{response_depth}}\n{{character_demeanor}}\n\n' || system_prompt
WHERE system_prompt IS NOT NULL
  AND system_prompt NOT LIKE '%{{conversation_register}}%';
