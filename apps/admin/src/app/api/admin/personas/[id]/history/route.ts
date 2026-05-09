import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const idParam = z.string().uuid()

/**
 * GET /api/admin/personas/[id]/history
 *
 * Returns up to 50 most-recent prompt-history rows for a persona, newest
 * first. Used by the Prompt history tab in the persona editor.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const { id } = await params
  if (!idParam.safeParse(id).success) {
    return Response.json({ error: "invalid_id" }, { status: 400 })
  }

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from("persona_prompt_history")
    .select(
      "id, persona_id, edited_by, edited_by_email, system_prompt, prompt_sections, reason, edited_at"
    )
    .eq("persona_id", id)
    .order("edited_at", { ascending: false })
    .limit(50)
  if (error) {
    return Response.json(
      { error: "read_failed", message: error.message },
      { status: 500 }
    )
  }

  return Response.json({ data: data ?? [] })
}
