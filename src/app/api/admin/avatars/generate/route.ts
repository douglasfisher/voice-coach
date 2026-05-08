import { randomUUID } from "node:crypto"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { generateRequestSchema } from "@/lib/avatars/schema"
import { loadAvatarConfig } from "@/lib/avatars/config"
import { invokeRunware, pickImage } from "@/lib/avatars/runware"

/**
 * Generate four 896x1152 draft portraits via the runware edge function.
 *
 * The edge function uploads each result into persona-avatars/drafts/ and
 * returns permanent storage URLs. We pass through the trimmed list to the
 * client so it can show a 4-up grid for selection.
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
  const parsed = generateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const batchId = randomUUID()

  // DB is the source of truth for model + dimensions + negative prompt.
  const { draft } = await loadAvatarConfig()

  try {
    const { data: images } = await invokeRunware({
      uploadToStorage: true,
      storagePrefix: "drafts",
      tasks: [
        {
          taskType: "imageInference",
          taskUUID: randomUUID(),
          model: draft.model,
          positivePrompt: parsed.data.prompt,
          negativePrompt: draft.negativePrompt,
          width: draft.width,
          height: draft.height,
          numberResults: draft.numberResults,
          outputFormat: "JPEG",
          CFGScale: draft.cfgScale,
          scheduler: draft.scheduler,
          includeCost: true,
          outputType: ["URL"],
          acceleration: "high",
        },
      ],
    })

    const drafts = images
      .map((img, i) => {
        const picked = pickImage(img)
        if (!picked) return null
        return {
          id: img.imageUUID ?? `draft_${i}`,
          url: picked.url,
          storagePath: picked.storagePath,
          cost: picked.cost,
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)

    if (drafts.length === 0) {
      return Response.json(
        { error: "no_images_returned" },
        { status: 502 }
      )
    }

    await audit(gate.ctx, {
      action: "avatar.generate",
      targetTable: "storage.objects",
      targetId: batchId,
      diff: {
        before: null,
        after: {
          batch_id: batchId,
          count: drafts.length,
          params: parsed.data.params,
          prompt: parsed.data.prompt,
          total_cost: drafts.reduce((s, d) => s + (d.cost ?? 0), 0),
        },
      },
    })

    return Response.json({
      data: { batchId, drafts },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json(
      { error: "runware_failed", message },
      { status: 502 }
    )
  }
}
