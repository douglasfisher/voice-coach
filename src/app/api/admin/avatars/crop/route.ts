import { randomUUID } from "node:crypto"
import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg"])
const sourceUrlSchema = z.string().url().max(2048)

/**
 * Receives a JPEG cropped from a Runware draft and uploads it to
 * persona-avatars/cropped/. Returns the public URL so the avatar generator
 * can hand it to the existing /api/admin/avatars/upscale endpoint as the
 * referenceImage for the hi-res "nano banana" call.
 */
export async function POST(req: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 })
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return Response.json({ error: "missing_file" }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: "unsupported_type", message: `Got ${file.type}` },
      { status: 400 }
    )
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return Response.json(
      { error: "size_out_of_range", message: `${file.size} bytes` },
      { status: 400 }
    )
  }

  const sourceUrlField = form.get("sourceUrl")
  const parsedSourceUrl =
    typeof sourceUrlField === "string"
      ? sourceUrlSchema.safeParse(sourceUrlField)
      : null
  const sourceUrl = parsedSourceUrl?.success ? parsedSourceUrl.data : null

  const buf = Buffer.from(await file.arrayBuffer())
  const ts = Date.now()
  const path = `cropped/${ts}_${randomUUID()}.jpg`

  const admin = createSupabaseAdminClient()
  const { error } = await admin.storage
    .from("persona-avatars")
    .upload(path, buf, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "31536000, immutable",
    })
  if (error) {
    return Response.json(
      { error: "upload_failed", message: error.message },
      { status: 500 }
    )
  }

  const { data } = admin.storage.from("persona-avatars").getPublicUrl(path)

  await audit(gate.ctx, {
    action: "avatar.crop",
    targetTable: "storage.objects",
    targetId: path,
    diff: {
      before: { source_url: sourceUrl },
      after: { cropped_url: data.publicUrl, bytes: file.size },
    },
  })

  return Response.json({ data: { url: data.publicUrl, path } })
}
