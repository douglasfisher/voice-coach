-- ============================================================================
-- Migration 073: Admin security primitives for the web admin app
--
-- Adds:
--   - user_role enum + user_profiles.role column (kept in sync with is_admin
--     so the mobile app's existing is_admin checks/writes keep working)
--   - is_admin(uid) SECURITY DEFINER helper for RLS + server-side gates
--   - admin_audit_log table for non-bypassable audit trail of admin mutations
--   - Optional impersonation flag to mark elevated sessions in the audit trail
-- ============================================================================

-- 1. Role enum -----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user';

-- Backfill role from existing is_admin flag
UPDATE user_profiles
SET role = 'admin'
WHERE COALESCE(is_admin, false) = true
  AND role = 'user';

-- 2. Bidirectional sync between role and is_admin -----------------------------
-- Keeps the mobile app's is_admin reads/writes coherent with role until we can
-- migrate the RN code over and drop is_admin in a future migration.
CREATE OR REPLACE FUNCTION sync_user_role_is_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- role changed: derive is_admin from role
  IF (TG_OP = 'INSERT')
     OR NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.is_admin := NEW.role IN ('admin', 'superadmin');
  END IF;

  -- is_admin changed (legacy mobile path): promote/demote role
  IF (TG_OP = 'UPDATE')
     AND NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND NEW.role IS NOT DISTINCT FROM OLD.role THEN
    IF NEW.is_admin = true AND NEW.role = 'user' THEN
      NEW.role := 'admin';
    ELSIF NEW.is_admin = false AND NEW.role IN ('admin', 'superadmin') THEN
      NEW.role := 'user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_role_is_admin ON user_profiles;
CREATE TRIGGER trg_sync_user_role_is_admin
  BEFORE INSERT OR UPDATE OF role, is_admin ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_is_admin();

-- 3. Admin gate function -------------------------------------------------------
-- SECURITY DEFINER so it can read user_profiles regardless of caller's RLS.
-- STABLE so the planner can cache it within a statement.
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE id = uid
      AND role IN ('admin', 'superadmin')
  );
$$;

REVOKE ALL ON FUNCTION is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated, service_role;

-- 4. Admin audit log -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  actor_email text,
  action      text NOT NULL,                     -- e.g. 'persona.update', 'user.ban'
  target_table text,
  target_id   text,
  diff        jsonb,                             -- { before: {...}, after: {...} }  field-level only
  ip          inet,
  user_agent  text,
  request_id  text,                              -- correlation id from the route handler
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
  ON admin_audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
  ON admin_audit_log (target_table, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
  ON admin_audit_log (action, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_audit_log_admin_read ON admin_audit_log;
CREATE POLICY admin_audit_log_admin_read
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies: writes only via the secret-key server.
-- Even superadmins cannot edit history through the API.

-- 5. Lock down user_profiles.role from end-user writes -------------------------
-- Users can update their own profile (display_name, avatar_url, etc.) but must
-- not be able to self-promote. Enforce by trigger so it works regardless of
-- which client (mobile or web) issues the update.
CREATE OR REPLACE FUNCTION prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  -- service_role / secret key has no auth.uid(); allow it through.
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT is_admin(caller) THEN
      RAISE EXCEPTION 'role/is_admin can only be changed by an admin'
        USING ERRCODE = '42501';
    END IF;
    -- Even admins cannot grant superadmin via this path; reserve it for SQL.
    IF NEW.role = 'superadmin' AND OLD.role <> 'superadmin' THEN
      RAISE EXCEPTION 'superadmin must be granted via direct SQL only'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON user_profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE UPDATE OF role, is_admin ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_role_escalation();

-- 6. Helper view for admin user list ------------------------------------------
-- Joins auth.users (email, last_sign_in_at) with user_profiles for the admin UI.
-- Read access gated on is_admin().
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
  p.current_level,
  p.total_sessions,
  p.streak_days,
  p.last_session_at,
  p.onboarding_completed
FROM user_profiles p
JOIN auth.users u ON u.id = p.id
WHERE is_admin(auth.uid());

GRANT SELECT ON admin_users_overview TO authenticated;

COMMENT ON TABLE admin_audit_log IS
  'Append-only log of admin mutations. Writes only via secret-key server routes.';
COMMENT ON FUNCTION is_admin(uuid) IS
  'Returns true if the given user has role admin or superadmin. Used by RLS and server gates.';
