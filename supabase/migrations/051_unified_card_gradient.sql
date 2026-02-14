-- Migration: Add unified_card_gradient setting
-- When enabled, all PersonaCards use a black gradient instead of per-style colored gradients

INSERT INTO app_settings (key, value, description)
VALUES (
  'unified_card_gradient',
  'false',
  'When enabled, all persona cards use a unified black gradient instead of per-style colored gradients'
)
ON CONFLICT (key) DO NOTHING;
