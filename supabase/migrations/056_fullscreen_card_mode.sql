-- Migration: Add fullscreen_card_mode setting
-- When enabled, persona/coach cards fill the screen with snap scrolling (one card at a time)

INSERT INTO app_settings (key, value, description)
VALUES (
  'fullscreen_card_mode',
  'false',
  'When enabled, persona cards display one at a time with snap scrolling instead of a scrollable list'
)
ON CONFLICT (key) DO NOTHING;
