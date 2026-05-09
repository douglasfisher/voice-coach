-- ============================================================================
-- Migration 074: Avatar generation parameter options moved to app_settings.
--
-- The mobile app's wizard had the 9 parameter option arrays (gender,
-- ethnicity, appearance, lighting, clothing, expression, accessories,
-- pose, camera) hardcoded in types/wizard.ts. The web admin now needs to
-- render the same form. Store the options in the DB so both apps read
-- from a single source of truth — adding a new ethnicity, expression,
-- etc. is a SQL-only change after this.
--
-- Companion to migration 064 (ai_avatar_config) which already holds the
-- model/dimensions/prompt template. This migration adds the parameter
-- options + defaults that feed that template's {{tokens}}.
-- ============================================================================

INSERT INTO app_settings (key, value, description)
VALUES (
  'ai_avatar_options',
  '{
    "gender": ["male", "female"],
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
      "soft studio", "dramatic Rembrandt", "natural window",
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
      "Canon 85mm f/1.4", "Sony 50mm f/1.2", "Nikon 105mm f/2.8",
      "Hasselblad medium format 150mm f2.8"
    ],
    "defaults": {
      "gender": "male",
      "ethnicity": "English",
      "appearance": "classically attractive",
      "lighting": "soft studio",
      "clothing": "business casual",
      "expression": "warm smile",
      "accessories": ["none"],
      "pose": "slight angle",
      "camera": "Canon 85mm f/1.4"
    },
    "multi_select": ["accessories"],
    "exclusive_values": {
      "accessories": "none"
    }
  }'::jsonb,
  'Avatar generation parameter options + defaults shown in the persona avatar wizard. Source of truth for both mobile and web admin. multi_select lists which fields accept arrays; exclusive_values names a value that, when selected, clears the others (e.g. ''none'' for accessories).'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();

-- Anon read access — same as other ai_* settings, so the mobile client
-- can fetch this at startup without elevated privileges.
DO $$ BEGIN
  -- The policy may already exist on app_settings; add this row to its scope
  -- by reusing the existing key-prefixed policy if there is one. If not,
  -- the existing public-read policy on app_settings (added in migration 052)
  -- already covers it.
  PERFORM 1;
END $$;
