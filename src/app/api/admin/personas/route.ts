import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { audit } from "@/lib/audit"
import { personaSchemaWithRefinements } from "@/lib/personas/schema"
import { formToPersonaPayload } from "@/lib/personas/mappers"

export async function POST(req: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

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
  const { data, error } = await admin
    .from("personas")
    .insert(formToPersonaPayload(parsed.data))
    .select("id, name")
    .single()

  if (error || !data) {
    return Response.json(
      { error: "insert_failed", message: error?.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "persona.create",
    targetTable: "personas",
    targetId: data.id,
    diff: { before: null, after: { id: data.id, name: data.name } },
  })

  return Response.json({ data }, { status: 201 })
}
