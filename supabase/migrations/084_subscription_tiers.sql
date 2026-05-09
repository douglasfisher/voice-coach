-- ============================================================================
-- Migration 084: Subscription tiers on user_profiles + per-tier limits.
--
-- Six tiers: free, freemium, basic, pro, enterprise, team.
--   - free       — anonymous / unverified, lowest cap
--   - freemium   — verified email, free with mild restrictions
--   - basic      — paid entry tier, individual users
--   - pro        — paid power-user tier (heavier daily cap)
--   - enterprise — paid org tier (large cap, SSO, white-glove)
--   - team       — multi-seat plan (per-seat billing); cap shared
--                  across the team via org_id (TBD; provisional column)
--
-- Limits live in app_settings.ai_tier_limits so they can be tuned without
-- a redeploy. The chat edge function reads from there at request time.
-- ============================================================================

-- Tier enum + column
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM (
    'free', 'freemium', 'basic', 'pro', 'enterprise', 'team'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier
    NOT NULL DEFAULT 'free';

-- Backfill: anyone with an existing email-confirmed account gets
-- freemium so we don't accidentally throttle existing users.
UPDATE user_profiles up
SET subscription_tier = 'freemium'
FROM auth.users u
WHERE u.id = up.id
  AND u.email_confirmed_at IS NOT NULL
  AND up.subscription_tier = 'free';

-- Audit-friendly: changes to subscription_tier should always be auditable
-- so create a tiny trigger that prevents end-users from self-promoting.
-- Same pattern as user_role's prevent_self_role_escalation in 073.
CREATE OR REPLACE FUNCTION prevent_self_tier_escalation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  -- service_role / secret key has no auth.uid() — admin path, allow.
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    IF NOT is_admin(caller) THEN
      RAISE EXCEPTION 'subscription_tier can only be changed by an admin'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_tier_escalation ON user_profiles;
CREATE TRIGGER trg_prevent_self_tier_escalation
  BEFORE UPDATE OF subscription_tier ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_tier_escalation();

-- Surface tier on the admin overview view so the user list and per-user
-- pages show it without an extra join.
CREATE OR REPLACE VIEW admin_users_overview
WITH (security_invoker = true) AS
SELECT
  p.id,
  u.email,
  u.created_at        AS auth_created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  p.display_name,
  p.avatar_url,
  p.role,
  p.is_admin,
  p.subscription_tier,
  p.current_level,
  p.total_sessions,
  p.streak_days,
  p.last_session_at,
  p.onboarding_completed
FROM user_profiles p
JOIN auth.users u ON u.id = p.id
WHERE is_admin(auth.uid());

GRANT SELECT ON admin_users_overview TO authenticated;

-- Per-tier limits in app_settings. Edge function reads these at chat time
-- and rejects with 429 when the requesting user's last-24h tokens exceed
-- their tier's cap. Limits are tokens (input + output combined).
INSERT INTO app_settings (key, value, description)
VALUES (
  'ai_tier_limits',
  jsonb_build_object(
    'free',        jsonb_build_object('daily_tokens', 10000,   'enforce', true),
    'freemium',    jsonb_build_object('daily_tokens', 50000,   'enforce', true),
    'basic',       jsonb_build_object('daily_tokens', 200000,  'enforce', true),
    'pro',         jsonb_build_object('daily_tokens', 1000000, 'enforce', true),
    'enterprise',  jsonb_build_object('daily_tokens', 5000000, 'enforce', false),
    'team',        jsonb_build_object('daily_tokens', 5000000, 'enforce', false)
  ),
  'Per-tier daily token limits + enforcement flag. enforce=false means soft (warn but allow). Read at request time by the chat edge function.'
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();

COMMENT ON COLUMN user_profiles.subscription_tier IS
  'free | freemium | basic | pro | enterprise | team. Default ''free'' for new sign-ups; the auth-confirmed backfill bumps existing users to ''freemium''. Per-tier daily limits live in app_settings.ai_tier_limits.';
