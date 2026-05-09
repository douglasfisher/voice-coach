-- ============================================================================
-- Migration 079: Persona generator constraints + avatar params output.
--
-- Two changes to the existing app_settings.ai_persona_generator row:
--
-- 1. The `details` user_template now accepts an optional {{constraints}}
--    block. The web admin's Generate-persona dialog has pre-flight selects
--    (gender, persona_type, age_range, ethnicity, appearance) — when set,
--    those are rendered into the constraints block which the AI MUST
--    respect. When the block is empty (mobile path / no constraints),
--    behaviour is identical to migration 078.
--
-- 2. The same template now asks the AI to return additional avatar fields
--    (gender, age_range, ethnicity, appearance, lighting, clothing,
--    expression, accessories, pose, camera) in the same JSON object so the
--    web admin can auto-fill the avatar form to match the new persona.
--    Mobile callers that ignore those fields are unaffected.
--
-- The {{persona_type}} variable was previously implicit ('coach' from
-- formData) — it's now explicit in the constraint block so the AI sees
-- the user's chosen type.
-- ============================================================================

UPDATE app_settings
SET value = jsonb_set(
  value::jsonb,
  '{details,user_template}',
  to_jsonb($tpl$Based on this avatar description, generate persona details for a coaching app character.

Avatar: {{age_range}} {{ethnicity}} {{gender}}, {{expression}}, wearing {{clothing}} attire, {{accessories}}.

{{constraints}}

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
- avatar: a nested object with these fields, all values matching the persona's described identity:
  - gender: "male" or "female"
  - age_range: an age bracket like "late twenties" or "early forties"
  - ethnicity: matches the cultural_background
  - appearance: one of: classically attractive, ruggedly handsome, striking features, warm and approachable, youthful and fresh-faced, distinguished and mature, quirky and unique, sharp and angular, soft and gentle, bold and commanding, girl-next-door, boy-next-door, elegant and refined, athletic and toned
  - lighting: one of: soft studio, hard studio, classic three point studio lighting, three-point studio lighting with sharp key, fill and rim separation, Rembrandt lighting with butterfly kicker and edge-lit hair light, high-contrast clamshell lighting with specular rim, split lighting with hot hair light and negative fill, butterfly beauty lighting with dual strip softbox rim lights, paramount lighting with wraparound cove fill and backlit hair, broad key with silver bounce fill and focused snoot hair light, large octabox key with gridded strip kickers at 45°, low-key chiaroscuro with single fresnel key and subtle hair kicker, high-key beauty dish with barn-doored background separation lights, tungsten-gelled key with cool-fill contrast and hot backlight, natural window, warm golden hour
  - clothing: one of: casual, business casual, formal, athletic, creative/bohemian, streetwear
  - expression: one of: warm smile, confident smirk, thoughtful gaze, friendly laugh, serene calm, intense focus
  - accessories: array of 1+ from: glasses, earrings, necklace, headband, scarf, hat, none (use ["none"] if no accessories)
  - pose: one of: straight-on, slight angle, three-quarter turn, profile
  - camera: one of: Canon 85mm f/1.4, Sony 50mm f/1.2, Nikon 105mm f/2.8, Hasselblad medium format 150mm f2.8, shot on medium format, f/2.8 shallow depth, editorial grade colour science, specular catch lights, magazine-quality retouching, Phase One IQ4 150MP detail

Return ONLY valid JSON, no markdown or explanation.$tpl$::text)
),
    updated_at = now()
WHERE key = 'ai_persona_generator';
