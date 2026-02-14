-- Migration: Allow anon role to read app_settings
-- Fixes auth race condition where useAppSetting fires before session restores,
-- causing queries to run as anon role → empty results → settings never take effect.
-- app_settings contains only non-sensitive config (model names, token limits, feature flags).

CREATE POLICY "Anon can read settings"
  ON public.app_settings
  FOR SELECT
  TO anon
  USING (true);

-- Fix any double-encoded JSONB boolean values (e.g. '"true"' instead of 'true')
UPDATE app_settings SET value = 'true'::jsonb
  WHERE key = 'unified_card_gradient' AND value = '"true"'::jsonb;
UPDATE app_settings SET value = 'false'::jsonb
  WHERE key = 'unified_card_gradient' AND value = '"false"'::jsonb;
