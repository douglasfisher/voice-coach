-- Migration: Update dating coach scenario prompt to support gender preferences
-- References USER CONTEXT that gets injected by the edge function when preferences are set

UPDATE personas SET qa_scenario_prompt =
'Generate a vivid, immersive dating scenario (2-3 sentences). Set the scene at a specific location (upscale bar, cozy coffee shop, art gallery, bookstore, rooftop party, farmers market, wine bar, gym, beach). Describe an attractive person who just caught their eye — include one distinctive physical detail and one behavioral detail. End with them about to make their move. If USER CONTEXT is provided, use the correct gender for the person described. Make it feel cinematic and exciting. Second person ("You..."), present tense.'
WHERE persona_type = 'coach' AND domain_id = (SELECT id FROM coaching_domains WHERE slug = 'dating');
