-- ============================================================================
-- Migration 050: Fix Q&A Scenario Generation
--
-- 1. Domain-aware qa_scene_template for each coaching domain
-- 2. Default qa_scenario_prompt for coaches missing one (migrations 041/044)
-- ============================================================================

-- ============================================================================
-- A. PER-DOMAIN qa_scene_template
--    Replaces the generic template with domain-specific instructions.
--    Only updates coaches that still have the original generic template
--    or NULL.
-- ============================================================================

-- Dating & Romance
UPDATE personas SET qa_scene_template =
'You are a creative scenario writer for dating and romance practice.

{{scenario_prompt}}

RULES:
- Output ONLY the scenario text, no quotes or formatting
- Second person present tense ("You...")
- Be vivid, specific and immersive
- Vary locations, settings, and details each time
- If context mentions gender preferences, use those for the person the user encounters
- Include realistic social dynamics and emotional stakes
- Make the other person feel like a real individual with their own personality'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'dating')
AND persona_type = 'coach';

-- Job Interviews
UPDATE personas SET qa_scene_template =
'You are a creative scenario writer for job interview practice.

{{scenario_prompt}}

RULES:
- Output ONLY the scenario text, no quotes or formatting
- Second person present tense ("You...")
- Be vivid, specific and immersive
- Vary companies, roles, and interviewer personalities each time
- Include realistic interview settings and pressure points
- Mention specific company details or role requirements to ground the scenario'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'interviews')
AND persona_type = 'coach';

-- Public Speaking / Presentations
UPDATE personas SET qa_scene_template =
'You are a creative scenario writer for public speaking and presentation practice.

{{scenario_prompt}}

RULES:
- Output ONLY the scenario text, no quotes or formatting
- Second person present tense ("You...")
- Be vivid, specific and immersive
- Vary audience sizes, venues, and stakes each time
- Include sensory details about the environment (stage, lighting, crowd)
- Make the stakes feel personal and meaningful'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'presentations')
AND persona_type = 'coach';

-- Negotiations
UPDATE personas SET qa_scene_template =
'You are a creative scenario writer for negotiation practice.

{{scenario_prompt}}

RULES:
- Output ONLY the scenario text, no quotes or formatting
- Second person present tense ("You...")
- Be vivid, specific and immersive
- Vary power dynamics, stakes, and relationship context each time
- Include specific numbers, terms, or positions at play
- Make both sides have legitimate interests'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'negotiations')
AND persona_type = 'coach';

-- Difficult Conversations
UPDATE personas SET qa_scene_template =
'You are a creative scenario writer for difficult conversation practice.

{{scenario_prompt}}

RULES:
- Output ONLY the scenario text, no quotes or formatting
- Second person present tense ("You...")
- Be vivid, specific and immersive
- Vary relationships, emotional dynamics, and settings each time
- Include the emotional weight and history behind the conversation
- Make both perspectives understandable'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'difficult_conversations')
AND persona_type = 'coach';

-- Professional Networking
UPDATE personas SET qa_scene_template =
'You are a creative scenario writer for professional networking practice.

{{scenario_prompt}}

RULES:
- Output ONLY the scenario text, no quotes or formatting
- Second person present tense ("You...")
- Be vivid, specific and immersive
- Vary event types, industries, and connection opportunities each time
- Include specific details about the event atmosphere and who is there
- Make the networking goal concrete and achievable'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'networking')
AND persona_type = 'coach';

-- Sales & Persuasion
UPDATE personas SET qa_scene_template =
'You are a creative scenario writer for sales and persuasion practice.

{{scenario_prompt}}

RULES:
- Output ONLY the scenario text, no quotes or formatting
- Second person present tense ("You...")
- Be vivid, specific and immersive
- Vary products, clients, and sales environments each time
- Include buyer objections or hesitations to navigate
- Make the sales context feel realistic with specific details'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'sales')
AND persona_type = 'coach';

-- Leadership & Management
UPDATE personas SET qa_scene_template =
'You are a creative scenario writer for leadership and management practice.

{{scenario_prompt}}

RULES:
- Output ONLY the scenario text, no quotes or formatting
- Second person present tense ("You...")
- Be vivid, specific and immersive
- Vary team sizes, challenges, and organizational contexts each time
- Include interpersonal dynamics and team tensions
- Make the leadership moment feel consequential'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'leadership')
AND persona_type = 'coach';

-- Career Transitions
UPDATE personas SET qa_scene_template =
'You are a creative scenario writer for career transition practice.

{{scenario_prompt}}

RULES:
- Output ONLY the scenario text, no quotes or formatting
- Second person present tense ("You...")
- Be vivid, specific and immersive
- Vary career stages, industries, and transition types each time
- Include the emotional complexity of change and uncertainty
- Make the opportunity or challenge feel specific and real'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'career_transitions')
AND persona_type = 'coach';


-- ============================================================================
-- B. DEFAULT qa_scenario_prompt FOR COACHES WITH NULL
--    Only applies to coaches added in migrations 041/044 that have no prompt.
--    Original 24 coaches (migration 040) keep their unique per-coach prompts.
-- ============================================================================

-- Dating coaches missing prompts
UPDATE personas SET qa_scenario_prompt =
'Generate a dating scenario (2-3 sentences) where the user encounters someone interesting and needs to navigate the social dynamics of the moment. Include a specific location and one vivid detail about the other person or setting.
{{character_demeanor}}
{{conversation_register}}
Second person ("You..."), present tense.'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'dating')
AND persona_type = 'coach'
AND qa_scenario_prompt IS NULL;

-- Interview coaches missing prompts
UPDATE personas SET qa_scenario_prompt =
'Generate a job interview scenario (2-3 sentences) with a specific company, role, and interviewer personality. Include one detail that raises the stakes or adds pressure to the situation.
{{character_demeanor}}
{{conversation_register}}
Second person ("You..."), present tense.'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'interviews')
AND persona_type = 'coach'
AND qa_scenario_prompt IS NULL;

-- Presentation coaches missing prompts
UPDATE personas SET qa_scenario_prompt =
'Generate a public speaking scenario (2-3 sentences) with a specific audience, venue, and topic. Include one detail about what makes this talk personally meaningful or high-stakes.
{{character_demeanor}}
{{conversation_register}}
Second person ("You..."), present tense.'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'presentations')
AND persona_type = 'coach'
AND qa_scenario_prompt IS NULL;

-- Negotiation coaches missing prompts
UPDATE personas SET qa_scenario_prompt =
'Generate a negotiation scenario (2-3 sentences) with specific stakes, a counterpart with their own interests, and a setting. Include one detail about the power dynamic or relationship history.
{{character_demeanor}}
{{conversation_register}}
Second person ("You..."), present tense.'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'negotiations')
AND persona_type = 'coach'
AND qa_scenario_prompt IS NULL;

-- Difficult conversation coaches missing prompts
UPDATE personas SET qa_scenario_prompt =
'Generate a difficult conversation scenario (2-3 sentences) involving a specific relationship and emotionally charged topic. Include who the user needs to talk to, why it matters, and one detail that makes it hard to bring up.
{{character_demeanor}}
{{conversation_register}}
Second person ("You..."), present tense.'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'difficult_conversations')
AND persona_type = 'coach'
AND qa_scenario_prompt IS NULL;

-- Networking coaches missing prompts
UPDATE personas SET qa_scenario_prompt =
'Generate a professional networking scenario (2-3 sentences) at a specific event or setting. Include the type of person the user wants to connect with and one detail that makes approaching them feel challenging.
{{character_demeanor}}
{{conversation_register}}
Second person ("You..."), present tense.'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'networking')
AND persona_type = 'coach'
AND qa_scenario_prompt IS NULL;

-- Sales coaches missing prompts
UPDATE personas SET qa_scenario_prompt =
'Generate a sales scenario (2-3 sentences) with a specific product or service, a prospect with clear needs, and a setting. Include one detail about a potential objection or hesitation the prospect might have.
{{character_demeanor}}
{{conversation_register}}
Second person ("You..."), present tense.'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'sales')
AND persona_type = 'coach'
AND qa_scenario_prompt IS NULL;

-- Leadership coaches missing prompts
UPDATE personas SET qa_scenario_prompt =
'Generate a leadership scenario (2-3 sentences) involving a team challenge, performance issue, or strategic decision. Include the specific situation, who is involved, and one detail that makes the leadership moment difficult.
{{character_demeanor}}
{{conversation_register}}
Second person ("You..."), present tense.'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'leadership')
AND persona_type = 'coach'
AND qa_scenario_prompt IS NULL;

-- Career transition coaches missing prompts
UPDATE personas SET qa_scenario_prompt =
'Generate a career transition scenario (2-3 sentences) involving a specific career change, pivot, or professional crossroads. Include the user''s current situation, what they''re considering, and one detail that makes the decision feel weighty.
{{character_demeanor}}
{{conversation_register}}
Second person ("You..."), present tense.'
WHERE domain_id = (SELECT id FROM coaching_domains WHERE slug = 'career_transitions')
AND persona_type = 'coach'
AND qa_scenario_prompt IS NULL;
