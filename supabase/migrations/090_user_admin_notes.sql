-- ============================================================================
-- Migration 090: Admin notes on user_profiles.
--
-- A free-text scratchpad for admins to leave context against a user
-- ("verified ID over Slack on 2026-04-12", "duplicate of doug@..." etc).
-- Different from admin_audit_log entries because notes are mutable
-- prose, while audit entries are immutable action records.
--
-- Visible only via the admin web app (the column is on user_profiles
-- but admin_users_overview is is_admin()-gated, and the regular RLS
-- policy on user_profiles only allows users to SELECT their own row —
-- which they can already see today).
--
-- We also surface it on admin_users_overview so the list/detail pages
-- can read it without an extra round-trip.
-- ============================================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS admin_notes text;

COMMENT ON COLUMN user_profiles.admin_notes IS
  'Free-text admin scratchpad. Set via the admin web app (web admin route uses the secret-key client to bypass the standard self-update RLS). Visible to the user themselves via their own profile select, which is acceptable — admins should treat this as user-visible.';

DROP VIEW IF EXISTS admin_users_overview;

CREATE VIEW admin_users_overview AS
SELECT
  p.id,
  u.email,
  u.created_at AS auth_created_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  p.display_name,
  p.avatar_url,
  p.role,
  p.is_admin,
  p.subscription_tier,
  p.disabled,
  p.admin_notes,
  p.current_level,
  p.total_sessions,
  p.streak_days,
  p.last_session_at,
  p.onboarding_completed
FROM user_profiles p
JOIN auth.users u ON u.id = p.id
WHERE is_admin(auth.uid());

COMMENT ON VIEW admin_users_overview IS
  'Admin-only join of user_profiles + auth.users. Updated in migration 090 to surface admin_notes for the user-detail page.';
