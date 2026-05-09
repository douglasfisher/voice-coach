import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { audit } from "@/lib/audit"
import { personaSchemaWithRefinements } from "@/lib/personas/schema"
import { formToPersonaPayload } from "@/lib/personas/mappers"

const idParam = z.string().uuid()

/** Compute a field-level diff so audit entries stay readable. */
function fieldDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>
) {
  const beforeOut: Record<string, unknown> = {}
  const afterOut: Record<string, unknown> = {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const k of keys) {
    const a = JSON.stringify(before[k] ?? null)
    const b = JSON.stringify(after[k] ?? null)
    if (a !== b) {
      beforeOut[k] = before[k]
      afterOut[k] = after[k]
    }
  }
  return { before: beforeOut, after: afterOut }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { id } = await params
  if (!idParam.safeParse(id).success) {
    return Response.json({ error: "invalid_id" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }

  const parsed = personaSchemaWithRefinements.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const admin = createSupabaseAdminClient()
  const { data: before, error: readErr } = await admin
    .from("personas")
    .select("*")
    .eq("id", id)
    .single()
  if (readErr || !before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  const payload = formToPersonaPayload(parsed.data)

  // Snapshot the BEFORE state of system_prompt + prompt_sections to
  // persona_prompt_history if either has changed. Lets admins restore
  // a prior version when an edit goes wrong. Snapshot is best-effort —
  // a failure here doesn't block the update, but we log loudly.
  const promptChanged =
    before.system_prompt !== payload.system_prompt ||
    JSON.stringify(before.prompt_sections ?? null) !==
      JSON.stringify(payload.prompt_sections ?? null)
  if (promptChanged) {
    const { error: histErr } = await admin
      .from("persona_prompt_history")
      .insert({
        persona_id: id,
        edited_by: gate.ctx.userId,
        edited_by_email: gate.ctx.email,
        system_prompt: before.system_prompt,
        prompt_sections: before.prompt_sections,
        reason: "edit",
      })
    if (histErr) {
      console.error("persona_prompt_history insert failed", histErr)
    }
  }

  const { data: after, error: writeErr } = await admin
    .from("personas")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()
  if (writeErr || !after) {
    return Response.json(
      { error: "update_failed", message: writeErr?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "persona.update",
    targetTable: "personas",
    targetId: id,
    diff: fieldDiff(
      before as Record<string, unknown>,
      after as Record<string, unknown>
    ),
  })

  return Response.json({ data: after })
}

const deleteQuery = z.object({
  hard: z.enum(["true", "false"]).optional(),
})

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { id } = await params
  if (!idParam.safeParse(id).success) {
    return Response.json({ error: "invalid_id" }, { status: 400 })
  }

  const url = new URL(req.url)
  const { hard } = deleteQuery.parse(Object.fromEntries(url.searchParams))
  const isHard = hard === "true"

  const admin = createSupabaseAdminClient()

  // Hard delete is reserved for superadmins to avoid accidental loss.
  if (isHard && gate.ctx.role !== "superadmin") {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }

  const { data: before } = await admin
    .from("personas")
    .select("id, name, is_active")
    .eq("id", id)
    .single()
  if (!before) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  if (isHard) {
    const { error } = await admin.from("personas").delete().eq("id", id)
    if (error) {
      return Response.json(
        { error: "delete_failed", message: error.message },
        { status: 500 }
      )
    }
    await audit(gate.ctx, {
      action: "persona.delete.hard",
      targetTable: "personas",
      targetId: id,
      diff: { before, after: null },
    })
    return Response.json({ data: { id } })
  }

  // Soft delete = is_active false.
  const { data: after, error } = await admin
    .from("personas")
    .update({ is_active: false })
    .eq("id", id)
    .select("id, name, is_active")
    .single()
  if (error || !after) {
    return Response.json(
      { error: "deactivate_failed", message: error?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "persona.delete.soft",
    targetTable: "personas",
    targetId: id,
    diff: { before, after },
  })

  return Response.json({ data: after })
}
