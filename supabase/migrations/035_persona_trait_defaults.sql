-- ============================================================================
-- Migration 035: Persona Trait Defaults + Prompt Cleanup
--
-- 1. Creates persona_trait_defaults table
-- 2. Populates per-persona default traits (replaces hardcoded rules)
-- 3. Removes CRITICAL CONVERSATION RULES blocks from all system_prompts
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

CREATE TABLE persona_trait_defaults (
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  trait_option_id UUID NOT NULL REFERENCES trait_options(id) ON DELETE CASCADE,
  PRIMARY KEY (persona_id, trait_option_id)
);

-- RLS
ALTER TABLE persona_trait_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "persona_trait_defaults_public_read" ON persona_trait_defaults
  FOR SELECT USING (true);

-- Enforce one default per persona per category via trigger
CREATE OR REPLACE FUNCTION check_one_trait_per_category()
RETURNS TRIGGER AS $$
DECLARE
  new_category_id UUID;
  conflict_count INTEGER;
BEGIN
  SELECT category_id INTO new_category_id FROM trait_options WHERE id = NEW.trait_option_id;

  SELECT COUNT(*) INTO conflict_count
  FROM persona_trait_defaults ptd
  JOIN trait_options o ON o.id = ptd.trait_option_id
  WHERE ptd.persona_id = NEW.persona_id
    AND o.category_id = new_category_id
    AND ptd.trait_option_id != NEW.trait_option_id;

  IF conflict_count > 0 THEN
    -- Replace existing default for this category
    DELETE FROM persona_trait_defaults
    WHERE persona_id = NEW.persona_id
      AND trait_option_id IN (
        SELECT ptd2.trait_option_id
        FROM persona_trait_defaults ptd2
        JOIN trait_options o2 ON o2.id = ptd2.trait_option_id
        WHERE ptd2.persona_id = NEW.persona_id AND o2.category_id = new_category_id
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_one_trait_per_category
  BEFORE INSERT ON persona_trait_defaults
  FOR EACH ROW EXECUTE FUNCTION check_one_trait_per_category();

-- ============================================================================
-- 2. POPULATE SHARED DEFAULTS
-- All personas get these baseline traits from the CRITICAL CONVERSATION RULES
-- ============================================================================

-- Helper: insert a default for all personas of a given type
-- We'll do this by joining personas × trait_options

-- ----- ALL PERSONAS: response_length → brief -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id
FROM personas p
CROSS JOIN trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE c.slug = 'response_length'
  AND o.slug = 'brief'
  AND p.system_prompt IS NOT NULL;

-- ----- ALL PERSONAS: question_frequency → occasional -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id
FROM personas p
CROSS JOIN trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE c.slug = 'question_frequency'
  AND o.slug = 'occasional'
  AND p.system_prompt IS NOT NULL;

-- ----- ALL PERSONAS: conversation_register → casual -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id
FROM personas p
CROSS JOIN trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE c.slug = 'conversation_register'
  AND o.slug = 'casual'
  AND p.system_prompt IS NOT NULL;

-- ----- COACHES: topic_flexibility → flexible -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id
FROM personas p
CROSS JOIN trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE c.slug = 'topic_flexibility'
  AND o.slug = 'flexible'
  AND p.persona_type = 'coach'
  AND p.system_prompt IS NOT NULL;

-- ----- COACHES: energy_mirroring → adaptive -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id
FROM personas p
CROSS JOIN trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE c.slug = 'energy_mirroring'
  AND o.slug = 'adaptive'
  AND p.persona_type = 'coach'
  AND p.system_prompt IS NOT NULL;

-- ----- CHALLENGERS: topic_flexibility → free_flowing -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id
FROM personas p
CROSS JOIN trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE c.slug = 'topic_flexibility'
  AND o.slug = 'free_flowing'
  AND p.persona_type = 'challenger'
  AND p.system_prompt IS NOT NULL;

-- ----- CHALLENGERS: energy_mirroring → full_mirror -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id
FROM personas p
CROSS JOIN trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE c.slug = 'energy_mirroring'
  AND o.slug = 'full_mirror'
  AND p.persona_type = 'challenger'
  AND p.system_prompt IS NOT NULL;

-- ============================================================================
-- 3. POPULATE PER-PERSONA COACHING METHOD (from challenge_style column)
-- ============================================================================

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id
FROM personas p
JOIN trait_options o ON o.slug = p.challenge_style
JOIN trait_categories c ON o.category_id = c.id AND c.slug = 'coaching_method'
WHERE p.challenge_style IS NOT NULL
  AND p.system_prompt IS NOT NULL;

-- ============================================================================
-- 4. POPULATE PERSONA-SPECIFIC TRAIT OVERRIDES
-- Based on CHARACTER TRAITS / identity text analysis
-- ============================================================================

-- ----- Jordan Chen: direct/blunt, intense, playful humor -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Jordan Chen' AND p.persona_type = 'coach'
  AND c.slug = 'directness' AND o.slug = 'blunt';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Jordan Chen' AND p.persona_type = 'coach'
  AND c.slug = 'challenge_intensity' AND o.slug = 'intense';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Jordan Chen' AND p.persona_type = 'coach'
  AND c.slug = 'humor_style' AND o.slug = 'dry_wit';

-- ----- James Morrison: direct, intense, serious -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'James Morrison' AND c.slug = 'directness' AND o.slug = 'direct';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'James Morrison' AND c.slug = 'challenge_intensity' AND o.slug = 'intense';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'James Morrison' AND c.slug = 'humor_style' AND o.slug = 'serious';

-- ----- Catherine Walsh: direct, intense -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Catherine Walsh' AND c.slug = 'directness' AND o.slug = 'direct';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Catherine Walsh' AND c.slug = 'challenge_intensity' AND o.slug = 'intense';

-- ----- Marcus Johnson: direct, observant -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Marcus Johnson' AND c.slug = 'directness' AND o.slug = 'direct';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Marcus Johnson' AND c.slug = 'emotional_attunement' AND o.slug = 'observant';

-- ----- Michael Santos: direct, professional register -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Michael Santos' AND c.slug = 'directness' AND o.slug = 'direct';

-- ----- Chris Martinez: playful humor -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Chris Martinez' AND c.slug = 'humor_style' AND o.slug = 'playful';

-- ----- Sam Taylor: playful humor -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Sam Taylor' AND c.slug = 'humor_style' AND o.slug = 'playful';

-- ----- Mia Chang: playful humor -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Mia Chang' AND c.slug = 'humor_style' AND o.slug = 'playful';

-- ----- Dr. Nina Patel: empathetic, gentle, diplomatic -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Nina Patel' AND c.slug = 'emotional_attunement' AND o.slug = 'deeply_attuned';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Nina Patel' AND c.slug = 'challenge_intensity' AND o.slug = 'gentle';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Nina Patel' AND c.slug = 'directness' AND o.slug = 'diplomatic';

-- ----- Dr. Maya Okonkwo: empathetic, diplomatic -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Maya Okonkwo' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Maya Okonkwo' AND c.slug = 'directness' AND o.slug = 'diplomatic';

-- ----- Dr. Sarah Kim: empathetic, engaging depth -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Sarah Kim' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Sarah Kim' AND c.slug = 'response_depth' AND o.slug = 'engaging';

-- ----- Lisa Park: empathetic, gentle -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Lisa Park' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Lisa Park' AND c.slug = 'challenge_intensity' AND o.slug = 'gentle';

-- ----- Grace Williams: empathetic, gentle -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Grace Williams' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Grace Williams' AND c.slug = 'challenge_intensity' AND o.slug = 'gentle';

-- ----- Omar Hassan: empathetic, diplomatic -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Omar Hassan' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Omar Hassan' AND c.slug = 'directness' AND o.slug = 'diplomatic';

-- ----- Alex Rivera: empathetic, gentle -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Alex Rivera' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Alex Rivera' AND c.slug = 'challenge_intensity' AND o.slug = 'gentle';

-- ----- Derek Thompson: playful, empathetic -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Derek Thompson' AND c.slug = 'humor_style' AND o.slug = 'playful';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Derek Thompson' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

-- ----- Priya Sharma: playful, direct -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Priya Sharma' AND c.slug = 'humor_style' AND o.slug = 'playful';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Priya Sharma' AND c.slug = 'directness' AND o.slug = 'direct';

-- ----- Aisha Rahman: playful, empathetic -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Aisha Rahman' AND c.slug = 'humor_style' AND o.slug = 'playful';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Aisha Rahman' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

-- ----- Emma Larsson: direct, engaging depth -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Emma Larsson' AND c.slug = 'directness' AND o.slug = 'direct';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Emma Larsson' AND c.slug = 'response_depth' AND o.slug = 'engaging';

-- ----- Victor Reyes: engaging depth, frequent questions (socratic) -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Victor Reyes' AND c.slug = 'response_depth' AND o.slug = 'engaging';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Victor Reyes' AND c.slug = 'question_frequency' AND o.slug = 'frequent'
ON CONFLICT DO NOTHING;

-- ----- Sophia Martinez: diplomatic, empathetic -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Sophia Martinez' AND c.slug = 'directness' AND o.slug = 'diplomatic';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Sophia Martinez' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

-- ----- David Park: observant, moderate challenge -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'David Park' AND c.slug = 'emotional_attunement' AND o.slug = 'observant';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'David Park' AND c.slug = 'challenge_intensity' AND o.slug = 'moderate';

-- ----- Marcus Webb (coach): observant, engaging depth -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Marcus Webb' AND p.persona_type = 'coach'
  AND c.slug = 'emotional_attunement' AND o.slug = 'observant';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Marcus Webb' AND p.persona_type = 'coach'
  AND c.slug = 'response_depth' AND o.slug = 'engaging';

-- ----- Yuki Yamamoto: empathetic, diplomatic -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Yuki Yamamoto' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Yuki Yamamoto' AND c.slug = 'directness' AND o.slug = 'diplomatic';

-- ===== CHALLENGERS =====

-- ----- Professor Elena Volkov: blunt, intense, academic, serious -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Professor Elena Volkov' AND c.slug = 'directness' AND o.slug = 'blunt';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Professor Elena Volkov' AND c.slug = 'challenge_intensity' AND o.slug = 'relentless';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Professor Elena Volkov' AND c.slug = 'conversation_register' AND o.slug = 'academic'
ON CONFLICT DO NOTHING;

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Professor Elena Volkov' AND c.slug = 'humor_style' AND o.slug = 'serious';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Professor Elena Volkov' AND c.slug = 'emotional_attunement' AND o.slug = 'matter_of_fact';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Professor Elena Volkov' AND c.slug = 'response_depth' AND o.slug = 'deep';

-- ----- Dr. Maya Chen: empathetic, diplomatic, engaging depth -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Maya Chen' AND c.slug = 'emotional_attunement' AND o.slug = 'deeply_attuned';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Maya Chen' AND c.slug = 'directness' AND o.slug = 'diplomatic';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Maya Chen' AND c.slug = 'challenge_intensity' AND o.slug = 'gentle';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Maya Chen' AND c.slug = 'response_depth' AND o.slug = 'engaging';

-- ----- Sarah Mitchell: direct, steelman (already via challenge_style) -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Sarah Mitchell' AND c.slug = 'directness' AND o.slug = 'direct';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Sarah Mitchell' AND c.slug = 'challenge_intensity' AND o.slug = 'intense';

-- ----- Dr. Raj Patel: direct, intense, deep, dry_wit -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Raj Patel' AND c.slug = 'directness' AND o.slug = 'direct';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Raj Patel' AND c.slug = 'challenge_intensity' AND o.slug = 'intense';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Raj Patel' AND c.slug = 'response_depth' AND o.slug = 'deep';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Dr. Raj Patel' AND c.slug = 'humor_style' AND o.slug = 'dry_wit';

-- ----- Father Thomas O'Brien: diplomatic, empathetic, indirect -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Father Thomas O''Brien' AND c.slug = 'directness' AND o.slug = 'indirect';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Father Thomas O''Brien' AND c.slug = 'emotional_attunement' AND o.slug = 'deeply_attuned';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Father Thomas O''Brien' AND c.slug = 'challenge_intensity' AND o.slug = 'gentle';

-- ----- Kofi Asante: empathetic, engaging depth -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Kofi Asante' AND c.slug = 'emotional_attunement' AND o.slug = 'empathetic';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Kofi Asante' AND c.slug = 'response_depth' AND o.slug = 'engaging';

-- ----- Marcus Webb (challenger): direct, intense, dry_wit -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Marcus Webb' AND p.persona_type = 'challenger'
  AND c.slug = 'directness' AND o.slug = 'direct';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Marcus Webb' AND p.persona_type = 'challenger'
  AND c.slug = 'challenge_intensity' AND o.slug = 'intense';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Marcus Webb' AND p.persona_type = 'challenger'
  AND c.slug = 'humor_style' AND o.slug = 'dry_wit';

-- ----- Yuki Tanaka: direct, intense, dry_wit -----
INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Yuki Tanaka' AND c.slug = 'directness' AND o.slug = 'direct';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Yuki Tanaka' AND c.slug = 'challenge_intensity' AND o.slug = 'intense';

INSERT INTO persona_trait_defaults (persona_id, trait_option_id)
SELECT p.id, o.id FROM personas p, trait_options o
JOIN trait_categories c ON o.category_id = c.id
WHERE p.name = 'Yuki Tanaka' AND c.slug = 'humor_style' AND o.slug = 'dry_wit';

-- ============================================================================
-- 5. REMOVE CRITICAL CONVERSATION RULES BLOCKS FROM ALL PROMPTS
-- Both variants: coach "roleplay" and challenger "texting"
-- ============================================================================

-- Challenger variant (texting)
UPDATE personas
SET system_prompt = regexp_replace(
  system_prompt,
  E'\n---\nCRITICAL CONVERSATION RULES \\(NON-NEGOTIABLE\\):\n- MAX 3 sentences\\. No exceptions\\.\n- Respond to what they JUST SAID - their last message is what matters\n- If they change topics, GO WITH THEM immediately\n- ONE follow-up question maximum \\(sometimes zero is better\\)\n- Match their energy and length - short gets short\n- NO SPEECHES\\. NO LECTURES\\. Write like texting\\.',
  '',
  'g'
)
WHERE system_prompt LIKE '%NO SPEECHES. NO LECTURES. Write like texting.%';

-- Coach variant (roleplay)
UPDATE personas
SET system_prompt = regexp_replace(
  system_prompt,
  E'\n---\nCRITICAL CONVERSATION RULES \\(NON-NEGOTIABLE\\):\n- MAX 3 sentences in roleplay mode\\. Keep it natural\\.\n- Respond to what they JUST SAID - stay present\n- ONE follow-up question maximum\n- Match their energy and length\n- Stay in character until explicitly asked for feedback\n- Write like a real conversation, not a lecture\\.',
  '',
  'g'
)
WHERE system_prompt LIKE '%Stay in character until explicitly asked for feedback%';

-- Clean up any trailing whitespace
UPDATE personas
SET system_prompt = rtrim(system_prompt)
WHERE system_prompt IS NOT NULL;
