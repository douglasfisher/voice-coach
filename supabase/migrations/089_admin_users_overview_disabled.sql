-- ============================================================================
-- Migration 089: Surface user_profiles.disabled on admin_users_overview.
--
-- The admin_users_overview view (admin-only, see migration 073's
-- is_admin gate) is what /admin/users reads. Adding `disabled` lets
-- the list show a "suspended" pill and lets the filter UI add a
-- disabled/active toggle.
--
-- DROP + CREATE because CREATE OR REPLACE silently fails to add a
-- column when one is appended in the middle of the column list (we
-- hit this earlier on migration 085 — same pattern, same fix).
-- ============================================================================

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
  p.current_level,
  p.total_sessions,
  p.streak_days,
  p.last_session_at,
  p.onboarding_completed
FROM user_profiles p
JOIN auth.users u ON u.id = p.id
WHERE is_admin(auth.uid());

COMMENT ON VIEW admin_users_overview IS
  'Admin-only join of user_profiles + auth.users. Gated by is_admin(auth.uid()) so non-admin reads return nothing. Updated in migration 089 to include `disabled` for the suspension UI.';
