-- Migration: Add Q&A Scenario Generation Prompts
-- Enables AI-generated scene descriptions for Q&A mode

-- =============================================================================
-- ADD qa_scenario_prompt COLUMN TO PERSONAS
-- =============================================================================

ALTER TABLE personas ADD COLUMN IF NOT EXISTS qa_scenario_prompt TEXT;

-- =============================================================================
-- DATING COACHES - Scenario Prompts
-- =============================================================================

UPDATE personas SET qa_scenario_prompt =
'Generate a brief, immersive dating scenario (2-3 sentences). Set the scene: a specific location (upscale bar, cozy coffee shop, art gallery, bookstore, rooftop party), describe an attractive stranger who just caught their eye with one distinctive detail, and end with them about to make their move. Make it feel cinematic and exciting. Second person ("You..."), present tense.'
WHERE persona_type = 'coach' AND domain_id = (SELECT id FROM coaching_domains WHERE slug = 'dating');

-- =============================================================================
-- INTERVIEW COACHES - Scenario Prompts
-- =============================================================================

UPDATE personas SET qa_scenario_prompt =
'Generate a brief interview scenario (2-3 sentences). They are in the interview room at a specific company type (startup, Fortune 500, tech giant, creative agency). Describe the interviewer briefly (their demeanor, something on their desk, the energy in the room) and what role they are interviewing for. End with them about to ask their first question. Second person, present tense.'
WHERE persona_type = 'coach' AND domain_id = (SELECT id FROM coaching_domains WHERE slug = 'interviews');

-- =============================================================================
-- PRESENTATION COACHES - Scenario Prompts
-- =============================================================================

UPDATE personas SET qa_scenario_prompt =
'Generate a brief presentation scenario (2-3 sentences). They are about to present in a specific setting (boardroom, conference stage, team meeting, investor pitch). Describe the audience (size, who is there, the stakes) and one sensory detail (the lighting, their heartbeat, the clicker in their hand). End with them about to speak their first words. Second person, present tense.'
WHERE persona_type = 'coach' AND domain_id = (SELECT id FROM coaching_domains WHERE slug = 'presentations');

-- =============================================================================
-- NEGOTIATION COACHES - Scenario Prompts
-- =============================================================================

UPDATE personas SET qa_scenario_prompt =
'Generate a brief negotiation scenario (2-3 sentences). Set the stakes and context (salary negotiation, business deal, contract terms, buying a car, asking for a raise). Describe the other party (their reputation, their opening position, the tension in the room). End with them about to make their opening move. Second person, present tense.'
WHERE persona_type = 'coach' AND domain_id = (SELECT id FROM coaching_domains WHERE slug = 'negotiations');

-- =============================================================================
-- DIFFICULT CONVERSATIONS COACHES - Scenario Prompts
-- =============================================================================

UPDATE personas SET qa_scenario_prompt =
'Generate a brief difficult conversation scenario (2-3 sentences). Describe who they need to talk to (boss, family member, friend, partner, colleague) and what about (setting a boundary, giving feedback, addressing a hurt, asking for change). Capture the tension or emotion in the air and one physical detail. End with them about to speak. Second person, present tense.'
WHERE persona_type = 'coach' AND domain_id = (SELECT id FROM coaching_domains WHERE slug = 'difficult_conversations');

-- =============================================================================
-- NETWORKING COACHES - Scenario Prompts
-- =============================================================================

UPDATE personas SET qa_scenario_prompt =
'Generate a brief networking scenario (2-3 sentences). Set the event (industry conference, startup mixer, alumni gathering, professional happy hour). Describe someone interesting they want to meet (what makes them stand out, their position or reputation). End with them about to approach. Second person, present tense.'
WHERE persona_type = 'coach' AND domain_id = (SELECT id FROM coaching_domains WHERE slug = 'networking');

-- =============================================================================
-- FALLBACK FOR ANY COACHES WITHOUT A DOMAIN
-- =============================================================================

UPDATE personas SET qa_scenario_prompt =
'Generate a brief practice scenario (2-3 sentences). Set a realistic scene relevant to communication practice. Describe the setting and the person they are about to interact with. End with them about to speak. Second person, present tense.'
WHERE persona_type = 'coach' AND qa_scenario_prompt IS NULL;
