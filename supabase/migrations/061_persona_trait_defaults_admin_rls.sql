-- Migration 061: Add admin RLS policies for persona_trait_defaults
-- Currently only has a public SELECT policy — admins need INSERT, UPDATE, DELETE

CREATE POLICY "Admins can insert persona_trait_defaults"
  ON persona_trait_defaults FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update persona_trait_defaults"
  ON persona_trait_defaults FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete persona_trait_defaults"
  ON persona_trait_defaults FOR DELETE
  TO authenticated
  USING (is_admin());
