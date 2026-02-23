-- ============================================================================
-- Migration 072: Add advisor_mode interaction mode
--
-- Advisors need a distinct conversation flow separate from coach Q&A mode.
-- advisor_mode = advisor asks clarifying questions, then gives tailored advice.
-- No scenarios, no feedback phases, no emotional progression.
-- ============================================================================

-- Update all advisor personas to use advisor_mode instead of question_mode
UPDATE personas
SET default_interaction_mode = 'advisor_mode'
WHERE persona_type = 'advisor';

-- Update any active conversations with advisor personas that are still on question_mode
UPDATE conversations c
SET interaction_mode = 'advisor_mode'
WHERE interaction_mode = 'question_mode'
  AND EXISTS (
    SELECT 1 FROM personas p
    WHERE p.id = c.persona_id
      AND p.persona_type = 'advisor'
  )
  AND c.status = 'active';
