import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const safeZoneSchema = z.object({
  head_top_pct: z.number().min(0).max(100),
  head_height_pct: z.number().min(0).max(100),
  shoulders_top_pct: z.number().min(0).max(100),
  shoulders_height_pct: z.number().min(0).max(100),
  horizontal_center_pct: z.number().min(0).max(100),
  head_width_pct: z.number().min(0).max(100),
})

const bodySchema = z.object({
  target_aspect: z.string().regex(/^\d+:\d+$/, {
    message: "Use the form W:H, e.g. 3:4",
  }),
  silhouette_svg: z
    .string()
    .trim()
    .min(20)
    .max(20000)
    .refine((s) => /^<svg[\s>]/i.test(s) && /<\/svg>\s*$/i.test(s), {
      message: "Must be a single <svg>…</svg> document",
    }),
  safe_zone: safeZoneSchema,
})

/**
 * Update the avatar composition row. The SVG is sanitised at render time
 * by CompositionOverlay (DOMPurify, svg profile) so we accept the raw
 * markup here — but we still validate the wrapper shape and field bounds.
 */
export async function PATCH(req: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const admin = createSupabaseAdminClient()
  const { data: before } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "ai_avatar_composition")
    .maybeSingle()

  const { error } = await admin
    .from("app_settings")
    .update({ value: parsed.data })
    .eq("key", "ai_avatar_composition")
  if (error) {
    return Response.json(
      { error: "update_failed", message: error.message },
      { status: 500 }
    )
  }

  await audit(gate.ctx, {
    action: "ai_config.avatar_composition.update",
    targetTable: "app_settings",
    targetId: "ai_avatar_composition",
    diff: {
      before: before?.value ?? null,
      after: parsed.data,
    },
  })

  return Response.json({ data: parsed.data })
}
