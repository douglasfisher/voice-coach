-- ============================================================================
-- Migration 075: Sync ai_avatar_options + ai_avatar_config to the latest
-- mobile-app values (types/wizard.ts, stores/wizardStore.ts).
--
-- Migration 074 seeded these from a snapshot that's now stale — the mobile
-- app has since added AGE_RANGE_OPTIONS, expanded LIGHTING_OPTIONS to 16
-- entries, expanded CAMERA_OPTIONS to 8, and changed several defaults.
-- The web admin must show identical options or generated avatars will
-- diverge between the two clients.
-- ============================================================================

UPDATE app_settings
SET value = '{
  "gender": ["male", "female"],
  "age_range": [
    "20", "early twenties", "late twenties",
    "early thirties", "late thirties",
    "early forties", "late forties",
    "early fifties", "late fifties",
    "early sixties", "late sixties",
    "early seventies", "late seventies",
    "early eighties", "late eighties",
    "early nineties", "late nineties",
    "100"
  ],
  "ethnicity": [
    "American", "African American", "Brazilian", "Mexican", "Colombian",
    "Indigenous American", "English", "Irish", "Scottish", "Scandinavian",
    "Norwegian", "Icelandic", "German", "Dutch", "Italian", "Spanish",
    "Greek", "French", "Eastern European", "Russian", "Arab", "Turkish",
    "Persian", "North African", "West African", "East African",
    "South African", "Indian", "Japanese", "Korean", "Chinese",
    "Filipino", "Thai", "Vietnamese", "Pacific Islander",
    "Australian Aboriginal", "Mixed Heritage"
  ],
  "appearance": [
    "classically attractive", "ruggedly handsome", "striking features",
    "warm and approachable", "youthful and fresh-faced",
    "distinguished and mature", "quirky and unique", "sharp and angular",
    "soft and gentle", "bold and commanding", "girl-next-door",
    "boy-next-door", "elegant and refined", "athletic and toned"
  ],
  "lighting": [
    "soft studio",
    "hard studio",
    "classic three point studio lighting",
    "three-point studio lighting with sharp key, fill and rim separation",
    "Rembrandt lighting with butterfly kicker and edge-lit hair light",
    "high-contrast clamshell lighting with specular rim",
    "split lighting with hot hair light and negative fill",
    "butterfly beauty lighting with dual strip softbox rim lights",
    "paramount lighting with wraparound cove fill and backlit hair",
    "broad key with silver bounce fill and focused snoot hair light",
    "large octabox key with gridded strip kickers at 45°",
    "low-key chiaroscuro with single fresnel key and subtle hair kicker",
    "high-key beauty dish with barn-doored background separation lights",
    "tungsten-gelled key with cool-fill contrast and hot backlight",
    "natural window",
    "warm golden hour"
  ],
  "clothing": [
    "casual", "business casual", "formal", "athletic",
    "creative/bohemian", "streetwear"
  ],
  "expression": [
    "warm smile", "confident smirk", "thoughtful gaze", "friendly laugh",
    "serene calm", "intense focus"
  ],
  "accessories": [
    "glasses", "earrings", "necklace", "headband", "scarf", "hat", "none"
  ],
  "pose": [
    "straight-on", "slight angle", "three-quarter turn", "profile"
  ],
  "camera": [
    "Canon 85mm f/1.4",
    "Sony 50mm f/1.2",
    "Nikon 105mm f/2.8",
    "Hasselblad medium format 150mm f2.8",
    "shot on medium format, f/2.8 shallow depth",
    "editorial grade colour science",
    "specular catch lights, magazine-quality retouching",
    "Phase One IQ4 150MP detail"
  ],
  "defaults": {
    "gender": "male",
    "age_range": "late twenties",
    "ethnicity": "English",
    "appearance": "classically attractive",
    "lighting": "Rembrandt lighting with butterfly kicker and edge-lit hair light",
    "clothing": "formal",
    "expression": "warm smile",
    "accessories": ["none"],
    "pose": "slight angle",
    "camera": "shot on medium format, f/2.8 shallow depth"
  },
  "multi_select": ["accessories"],
  "exclusive_values": {
    "accessories": "none"
  }
}'::jsonb,
    description = 'Avatar generation parameter options + defaults shown in the persona avatar wizard. Source of truth for mobile and web admin. multi_select lists which fields accept arrays; exclusive_values names a value that, when selected, clears the others.',
    updated_at = now()
WHERE key = 'ai_avatar_options';

-- Update the draft prompt template to include {{age_range}} so the
-- Age Range parameter actually flows into the generated prompt. New
-- ordering matches the mobile builder: age before appearance.
UPDATE app_settings
SET value = jsonb_set(
  value::jsonb,
  '{draft,prompt_template}',
  to_jsonb(
    'A classic mid-length head and shoulders portrait of a {{age_range}} {{appearance}} {{ethnicity}} {{gender}}, {{expression}}, wearing {{clothing}} attire, {{accessories}}, {{pose}} composition, lit with {{lighting}} lighting on a dark charcoal background with space around. Shot on {{camera}}.'::text
  )
),
    updated_at = now()
WHERE key = 'ai_avatar_config';
