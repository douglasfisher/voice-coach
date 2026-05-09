-- ============================================================================
-- Migration 085: Re-create admin_users_overview to include subscription_tier.
--
-- 084 used CREATE OR REPLACE VIEW which silently failed to add the new
-- column because PostgreSQL only permits OR REPLACE to add columns at
-- the END of the column list (preserving order). Drop + recreate avoids
-- the constraint.
-- ============================================================================

DROP VIEW IF EXISTS admin_users_overview;

CREATE VIEW admin_users_overview
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
