-- ============================================================================
-- Migration 063: Security Hardening — Attack Surface Remediation
--
-- Fixes:
-- 1A. CRITICAL — Block user self-promotion to admin via user_profiles UPDATE
-- 1B. CRITICAL — Lock down conversation_traits to conversation owner only
-- 1C. HIGH    — Fix migration 036 admin policies (profiles → user_profiles typo)
-- 1D. HIGH    — Enable RLS on achievements reference table
-- ============================================================================

-- ============================================================================
-- 1A. CRITICAL — Block self-promotion to admin
-- ============================================================================
-- The existing policy allows users to UPDATE any column on their own row,
-- including is_admin. Replace with a policy that prevents is_admin changes
-- unless the caller is already an admin.

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- is_admin must stay the same as the current DB value...
      is_admin IS NOT DISTINCT FROM (SELECT up.is_admin FROM user_profiles up WHERE up.id = auth.uid())
      -- ...unless the caller is already an admin
      OR (SELECT up.is_admin FROM user_profiles up WHERE up.id = auth.uid()) = true
    )
  );

-- ============================================================================
-- 1B. CRITICAL — Lock down conversation_traits
-- ============================================================================
-- Current policies use USING (true) — any authenticated user can read/write/delete
-- ANY user's traits. Scope to conversations owned by the current user.

DROP POLICY IF EXISTS "conversation_traits_auth_read" ON conversation_traits;
DROP POLICY IF EXISTS "conversation_traits_auth_insert" ON conversation_traits;
DROP POLICY IF EXISTS "conversation_traits_auth_delete" ON conversation_traits;

CREATE POLICY "conversation_traits_own_read" ON conversation_traits
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );

CREATE POLICY "conversation_traits_own_insert" ON conversation_traits
  FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );

CREATE POLICY "conversation_traits_own_delete" ON conversation_traits
  FOR DELETE TO authenticated
  USING (
    conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 1C. HIGH — Fix migration 036 table name typo (profiles → user_profiles)
-- ============================================================================
-- All admin policies in 036 reference "profiles" which doesn't exist.
-- The correct table is "user_profiles". This silently breaks all admin
-- trait management operations.

-- trait_categories admin update
DROP POLICY IF EXISTS "trait_categories_admin_update" ON trait_categories;

CREATE POLICY "trait_categories_admin_update" ON trait_categories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- trait_options admin insert
DROP POLICY IF EXISTS "trait_options_admin_insert" ON trait_options;

CREATE POLICY "trait_options_admin_insert" ON trait_options
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- trait_options admin update
DROP POLICY IF EXISTS "trait_options_admin_update" ON trait_options;

CREATE POLICY "trait_options_admin_update" ON trait_options
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- persona_trait_defaults admin insert
DROP POLICY IF EXISTS "persona_trait_defaults_admin_insert" ON persona_trait_defaults;

CREATE POLICY "persona_trait_defaults_admin_insert" ON persona_trait_defaults
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- persona_trait_defaults admin update
DROP POLICY IF EXISTS "persona_trait_defaults_admin_update" ON persona_trait_defaults;

CREATE POLICY "persona_trait_defaults_admin_update" ON persona_trait_defaults
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- persona_trait_defaults admin delete
DROP POLICY IF EXISTS "persona_trait_defaults_admin_delete" ON persona_trait_defaults;

CREATE POLICY "persona_trait_defaults_admin_delete" ON persona_trait_defaults
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Fix the RPC function too (also references "profiles" instead of "user_profiles")
CREATE OR REPLACE FUNCTION toggle_trait_user_visible(
  p_category_id UUID,
  p_visible BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  UPDATE trait_categories
  SET user_visible = p_visible
  WHERE id = p_category_id;
END;
$$;

-- ============================================================================
-- 1D. HIGH — Enable RLS on achievements reference table
-- ============================================================================
-- The achievements table (definitions, not user_achievements) has no RLS at all.
-- It's a read-only reference table, so allow public SELECT only.

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read achievements" ON achievements
  FOR SELECT USING (true);
