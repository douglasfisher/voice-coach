import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/admin/avatars/library — paginated, filterable list of
 * avatar_library rows. Server-rendered for the admin browser page;
 * client-rendered for the pick-from-library modal on the persona
 * Avatar tab.
 */
const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  gender: z.string().max(40).optional(),
  ethnicity: z.string().max(80).optional(),
  status: z.enum(["used", "unused"]).optional(),
  kind: z.enum(["draft", "hires"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(120).default(60),
})

export async function GET(req: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  const url = new URL(req.url)
  const parsed = querySchema.safeParse(
    Object.fromEntries(url.searchParams)
  )
  if (!parsed.success) {
    return Response.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 }
    )
  }
  const { q, gender, ethnicity, status, kind, page, pageSize } = parsed.data

  const admin = createSupabaseAdminClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = admin
    .from("avatar_library")
    .select(
      "id, storage_path, public_url, prompt, params, gender, ethnicity, generation_batch_id, is_hi_res, used_by_persona_id, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  if (gender) query = query.eq("gender", gender)
  if (ethnicity) query = query.eq("ethnicity", ethnicity)
  if (status === "used") query = query.not("used_by_persona_id", "is", null)
  if (status === "unused") query = query.is("used_by_persona_id", null)
  if (kind === "hires") query = query.eq("is_hi_res", true)
  if (kind === "draft") query = query.eq("is_hi_res", false)
  if (q) {
    query = query.or(
      `prompt.ilike.%${q}%,storage_path.ilike.%${q}%`
    )
  }

  const { data, count, error } = await query
  if (error) {
    return Response.json(
      { error: "query_failed", message: error.message },
      { status: 500 }
    )
  }

  return Response.json({
    data: { rows: data ?? [], total: count ?? 0, page, pageSize },
  })
}
