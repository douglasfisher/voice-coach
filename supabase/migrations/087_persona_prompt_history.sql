-- ============================================================================
-- Migration 087: Persona prompt history (versioning).
--
-- Every successful PATCH to personas.system_prompt or
-- personas.prompt_sections snapshots the PREVIOUS state into this table
-- before the update is applied (snapshot is written by the web admin's
-- PATCH route using the secret-key client). This gives admins a way to
-- restore an earlier version when a prompt edit makes things worse —
-- the audit_log captures *what* changed; this captures the body itself.
--
-- ON DELETE CASCADE: when a persona is hard-deleted, drop its history
-- with it. We keep the audit_log entry separately for that delete.
-- ============================================================================

CREATE TABLE IF NOT EXISTS persona_prompt_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id      uuid NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  edited_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_by_email text,
  -- Snapshot of the *previous* values (i.e. what the persona looked
  -- like BEFORE the update). Restoring sets the persona back to these.
  system_prompt   text,
  prompt_sections jsonb,
  -- Bookkeeping
  reason          text,        -- "edit" | "ai_write_all" | "restore" | etc.
  edited_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persona_prompt_history_persona
  ON persona_prompt_history (persona_id, edited_at DESC);

ALTER TABLE persona_prompt_history ENABLE ROW LEVEL SECURITY;

-- Admins read all; no end-user access.
DROP POLICY IF EXISTS persona_prompt_history_admin_read
  ON persona_prompt_history;
CREATE POLICY persona_prompt_history_admin_read
  ON persona_prompt_history FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies: history writes only via the
-- secret-key server (PATCH route), and rows aren't editable after the
-- fact. Rotation/cleanup handled separately if needed.

COMMENT ON TABLE persona_prompt_history IS
  'Append-only history of persona system_prompt + prompt_sections changes. Snapshot is written BEFORE the new values are applied so restoring sets the persona back to a known prior state.';
