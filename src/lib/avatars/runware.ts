import "server-only"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"

/** Result of an `imageInference` task as the runware edge function returns it.
 * The function uploads to storage and adds storageUrl/storagePath fields. */
export type RunwareImage = {
  imageUUID?: string
  imageURL?: string
  imageUrl?: string
  storageUrl?: string
  storagePath?: string
  cost?: number
}

type RunwareResponse =
  | RunwareImage[]
  | { data?: RunwareImage[] }
  | undefined
  | null

/** Best-effort URL/path extraction from a Runware response. */
export function pickImage(img: RunwareImage | undefined) {
  if (!img) return null
  const url = img.storageUrl ?? img.imageURL ?? img.imageUrl
  if (!url) return null
  return {
    url,
    storagePath: img.storagePath ?? "",
    cost: img.cost ?? 0,
  }
}

export function imagesFromResponse(resp: RunwareResponse): RunwareImage[] {
  if (!resp) return []
  if (Array.isArray(resp)) return resp
  return resp.data ?? []
}

/**
 * Invoke the runware edge function with the given task payload.
 *
 * Uses the secret-key admin client so the call is server-to-server even
 * though the runware function is deployed with --no-verify-jwt. This lets
 * us rate-limit, audit, and gate from the route handler.
 */
export async function invokeRunware(body: {
  uploadToStorage: true
  storagePrefix: "drafts" | "hires"
  tasks: unknown[]
}): Promise<{ data: RunwareImage[]; raw: unknown }> {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.functions.invoke("runware", { body })
  if (error) {
    let detail: string | undefined
    try {
      const ctx = (error as { context?: { text?: () => Promise<string> } })
        .context
      detail = await ctx?.text?.()
    } catch {
      // ignore
    }
    const wrapped = new Error(
      `runware invoke failed: ${error.message}${detail ? ` — ${detail}` : ""}`
    )
    throw wrapped
  }
  return { data: imagesFromResponse(data as RunwareResponse), raw: data }
}
