-- Migration 060: Add admin RLS policies for personas table
-- Currently only SELECT exists - admins need INSERT, UPDATE, DELETE

-- Helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Allow admins to view ALL personas (including inactive)
CREATE POLICY "Admins can view all personas"
  ON personas FOR SELECT
  TO authenticated
  USING (is_admin());

-- Allow admins to insert personas
CREATE POLICY "Admins can insert personas"
  ON personas FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Allow admins to update personas
CREATE POLICY "Admins can update personas"
  ON personas FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow admins to delete personas
CREATE POLICY "Admins can delete personas"
  ON personas FOR DELETE
  TO authenticated
  USING (is_admin());
