-- ============================================================================
-- Migration 088: Soft-ban support — user_profiles.disabled.
--
-- Adds a `disabled` boolean to user_profiles so admins can suspend an
-- account without losing its history (sessions, audit trail, billing
-- records). Hard delete is a separate path (auth.admin.deleteUser via
-- the admin API) and remains superadmin-only.
--
-- Behaviour notes:
--   - Default false. Backfill is implicit because the column is NOT NULL
--     with a default.
--   - Mobile/web should check this flag at session bootstrap and refuse
--     to load the app for disabled users (with a clear message). That
--     refusal lives in client/edge code, not in this migration — RLS
--     policies are intentionally unchanged so admins can still inspect
--     disabled accounts.
--   - The `is_admin` self-promotion guard from migration 063 already
--     prevents users from un-disabling themselves: WITH CHECK clause
--     locks down the `disabled` column with the same pattern.
--
-- Index: not added. Bans are rare (compared to row count) and the
-- query patterns are by-id not by-disabled, so an index would just be
-- write overhead.
-- ============================================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.disabled IS
  'Soft-ban flag. true = account suspended (admin-set). Mobile/web check this at bootstrap and refuse load. Hard delete is a separate path via auth.admin.deleteUser.';

-- Tighten the existing self-update policy so users can't flip
-- `disabled` on themselves. Mirrors migration 063's is_admin guard.
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- is_admin must stay the same as the current DB value...
      is_admin IS NOT DISTINCT FROM (SELECT up.is_admin FROM user_profiles up WHERE up.id = auth.uid())
      -- ...unless the caller is already an admin.
      OR (SELECT up.is_admin FROM user_profiles up WHERE up.id = auth.uid()) = true
    )
    AND (
      -- disabled must stay the same — only admins flip this column,
      -- via the secret-key admin API (which bypasses RLS).
      disabled IS NOT DISTINCT FROM (SELECT up.disabled FROM user_profiles up WHERE up.id = auth.uid())
      OR (SELECT up.is_admin FROM user_profiles up WHERE up.id = auth.uid()) = true
    )
  );
