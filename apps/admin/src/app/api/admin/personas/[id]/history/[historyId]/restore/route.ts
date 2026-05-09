import { z } from "zod"

import { audit } from "@/lib/audit"
import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"

const idParam = z.string().uuid()

type HistoryInsert =
  Database["public"]["Tables"]["persona_prompt_history"]["Insert"]
type PersonaUpdate = Database["public"]["Tables"]["personas"]["Update"]

/**
 * POST /api/admin/personas/[id]/history/[historyId]/restore
 *
 * Restore a persona's system_prompt + prompt_sections to the values in
 * the named history row. Snapshots the CURRENT values into history first
 * (with reason="restore") so the restore itself is reversible — every
 * step is in the audit trail, every state is recoverable.
 */
export async function POST(
  _req: Request,
  {
    params,
  }: { params: Promise<{ id: string; historyId: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { id, historyId } = await params
  if (
    !idParam.safeParse(id).success ||
    !idParam.safeParse(historyId).success
  ) {
    return Response.json({ error: "invalid_id" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()

  const { data: hist, error: histErr } = await admin
    .from("persona_prompt_history")
    .select("id, persona_id, system_prompt, prompt_sections")
    .eq("id", historyId)
    .eq("persona_id", id)
    .single()
  if (histErr || !hist) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  const { data: before, error: readErr } = await admin
    .from("personas")
    .select("id, system_prompt, prompt_sections")
    .eq("id", id)
    .single()
  if (readErr || !before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  // Snapshot current state before restoring so the user can roll forward
  // again if the restore was wrong.
  const snapshot: HistoryInsert = {
    persona_id: id,
    edited_by: gate.ctx.userId,
    edited_by_email: gate.ctx.email,
    system_prompt: before.system_prompt,
    prompt_sections:
      before.prompt_sections as HistoryInsert["prompt_sections"],
    reason: "restore",
  }
  const { error: snapErr } = await admin
    .from("persona_prompt_history")
    .insert(snapshot)
  if (snapErr) {
    console.error("persona_prompt_history snapshot before restore failed", snapErr)
  }

  const update: PersonaUpdate = {
    system_prompt: hist.system_prompt ?? "",
    prompt_sections:
      hist.prompt_sections as PersonaUpdate["prompt_sections"],
  }
  const { error: writeErr } = await admin
    .from("personas")
    .update(update)
    .eq("id", id)
  if (writeErr) {
    return Response.json(
      { error: "update_failed", message: writeErr.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "persona.prompt.restore",
    targetTable: "personas",
    targetId: id,
    diff: {
      before: {
        system_prompt: before.system_prompt,
        prompt_sections: before.prompt_sections,
      },
      after: {
        system_prompt: hist.system_prompt,
        prompt_sections: hist.prompt_sections,
        restored_from_history_id: hist.id,
      },
    },
  })

  return Response.json({ ok: true })
}
