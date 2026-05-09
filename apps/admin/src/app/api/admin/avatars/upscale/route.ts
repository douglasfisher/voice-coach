import { randomUUID } from "node:crypto"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { upscaleRequestSchema } from "@/lib/avatars/schema"
import { loadAvatarConfig } from "@/lib/avatars/config"
import { invokeRunware, pickImage } from "@/lib/avatars/runware"
import { recordAvatarLibraryRow } from "@/lib/avatars/library"
import { recordAdminAiUsage } from "@/lib/ai/usage"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/**
 * Upscale a selected draft to a 1792x2400 photoreal portrait.
 *
 * Calls the same runware edge function but with the Google Imagen model
 * (google:4@2) and the selected draft as a reference image. The prompt
 * tells the model to keep the pose/composition but render full photoreal
 * detail. Result lands in persona-avatars/hires/.
 */
export async function POST(req: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }
  const parsed = upscaleRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  // DB is the source of truth for the upscale model + dimensions + prompt.
  const { hires } = await loadAvatarConfig()

  try {
    const { data: images } = await invokeRunware({
      uploadToStorage: true,
      storagePrefix: "hires",
      tasks: [
        {
          taskType: "imageInference",
          taskUUID: randomUUID(),
          model: hires.model,
          positivePrompt: hires.prompt,
          referenceImages: [parsed.data.draftUrl],
          width: hires.width,
          height: hires.height,
          numberResults: 1,
          outputFormat: "JPEG",
          includeCost: true,
          outputType: ["URL"],
        },
      ],
    })

    const picked = pickImage(images[0])
    if (!picked) {
      return Response.json(
        { error: "no_image_returned" },
        { status: 502 }
      )
    }

    // Record the hi-res in avatar_library, linked back to the draft batch
    // when the client provided one. is_hi_res=true so the library browser
    // can filter for "ready to use" avatars vs concept drafts.
    const batchId = parsed.data.batchId ?? randomUUID()
    const params = parsed.data.params
    const admin = createSupabaseAdminClient()
    await recordAvatarLibraryRow(admin, {
      storage_path: picked.storagePath,
      public_url: picked.url,
      prompt: hires.prompt,
      params: params ?? null,
      gender: params?.gender ?? null,
      ethnicity: params?.ethnicity ?? null,
      created_by: gate.ctx.userId,
      generation_batch_id: batchId,
      is_hi_res: true,
    })

    // Cost tracking — Runware reports cost per upscale.
    await recordAdminAiUsage(admin, {
      userId: gate.ctx.userId,
      model: hires.model,
      promptTokens: 0,
      completionTokens: 1,
      estimatedCostCents: Math.round((picked.cost ?? 0) * 100),
      taskType: "image_generation",
    })

    await audit(gate.ctx, {
      action: "avatar.upscale",
      targetTable: "storage.objects",
      targetId: picked.storagePath,
      diff: {
        before: { draft_url: parsed.data.draftUrl },
        after: {
          hires_url: picked.url,
          hires_storage_path: picked.storagePath,
          cost: picked.cost,
        },
      },
    })

    return Response.json({
      data: {
        url: picked.url,
        storagePath: picked.storagePath,
        cost: picked.cost,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json(
      { error: "runware_failed", message },
      { status: 502 }
    )
  }
}
