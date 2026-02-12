-- Migration: Add focus_mode_chat setting
-- When enabled, chat shows only the latest exchange instead of full message history

INSERT INTO app_settings (key, value, description)
VALUES (
  'focus_mode_chat',
  'false',
  'When enabled, chat shows only the latest exchange (last AI + user message) instead of full scrolling history'
)
ON CONFLICT (key) DO NOTHING;
