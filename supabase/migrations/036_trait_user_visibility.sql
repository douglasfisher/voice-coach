-- ============================================================================
-- Migration 036: Trait User Visibility + Admin RLS
--
-- 1. Add user_visible column to trait_categories
-- 2. Set 4 categories as user-visible by default
-- 3. Add admin write policies for trait tables
-- ============================================================================

-- 1. ADD COLUMN
ALTER TABLE trait_categories
  ADD COLUMN user_visible BOOLEAN DEFAULT false;

-- 2. SET USER-VISIBLE DEFAULTS
UPDATE trait_categories SET user_visible = true
WHERE slug IN (
  'character_demeanor',   -- personality vibe (shy/friendly/bold/flirty)
  'response_length',      -- practical UX preference (terse vs detailed)
  'challenge_intensity',  -- core value prop, controls difficulty level
  'humor_style'           -- fun personality lever (serious/dry wit/playful)
);

-- 3. ADMIN RLS POLICIES
-- Admin write on trait_categories
CREATE POLICY "trait_categories_admin_update" ON trait_categories
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin write on trait_options
CREATE POLICY "trait_options_admin_insert" ON trait_options
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "trait_options_admin_update" ON trait_options
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin write on persona_trait_defaults
CREATE POLICY "persona_trait_defaults_admin_insert" ON persona_trait_defaults
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "persona_trait_defaults_admin_update" ON persona_trait_defaults
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "persona_trait_defaults_admin_delete" ON persona_trait_defaults
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. RPC FUNCTION (bypasses PostgREST schema cache for new columns)
CREATE OR REPLACE FUNCTION toggle_trait_user_visible(
  p_category_id UUID,
  p_visible BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  UPDATE trait_categories
  SET user_visible = p_visible
  WHERE id = p_category_id;
END;
$$;
