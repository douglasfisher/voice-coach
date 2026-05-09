import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"

/**
 * Default voice IDs used when creating a persona. Read from
 * app_settings.ai_voice_defaults — DB-driven so admins can tweak the
 * defaults (or swap providers) without a redeploy.
 *
 * `allDefaultIds` is the set of every value the system has ever auto-
 * picked. The UI uses it to decide "is the current voice_id still on a
 * default?" — if yes, gender changes auto-update it; if no (admin set it
 * manually), it's preserved.
 */
export type VoiceDefaults = {
  provider: string
  byGender: Record<string, string>
  allDefaultIds: Set<string>
}

const FALLBACK: VoiceDefaults = {
  provider: "elevenlabs",
  byGender: {
    male: "pMsXgVXv3BLzUgSXRplE",
    female: "jsCqWAovK2LkecY7zXl4",
  },
  allDefaultIds: new Set([
    "pMsXgVXv3BLzUgSXRplE",
    "jsCqWAovK2LkecY7zXl4",
  ]),
}

export async function loadVoiceDefaults(): Promise<VoiceDefaults> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_voice_defaults")
    .maybeSingle()

  if (!data?.value || typeof data.value !== "object") return FALLBACK
  const v = data.value as Record<string, unknown>

  const provider =
    typeof v.provider === "string" ? v.provider : FALLBACK.provider
  const byGender: Record<string, string> = {}
  if (v.by_gender && typeof v.by_gender === "object") {
    for (const [k, val] of Object.entries(v.by_gender as Record<string, unknown>)) {
      if (typeof val === "string" && val.length > 0) byGender[k] = val
    }
  }
  if (Object.keys(byGender).length === 0) {
    Object.assign(byGender, FALLBACK.byGender)
  }

  const allList = Array.isArray(v.all_default_ids)
    ? (v.all_default_ids.filter(
        (s) => typeof s === "string" && s.length > 0
      ) as string[])
    : Object.values(byGender)

  return {
    provider,
    byGender,
    allDefaultIds: new Set([...allList, ...Object.values(byGender)]),
  }
}

/** Plain serialisable shape for handing to client components. Sets become arrays. */
export type VoiceDefaultsClient = {
  provider: string
  byGender: Record<string, string>
  allDefaultIds: string[]
}

export function toClient(v: VoiceDefaults): VoiceDefaultsClient {
  return {
    provider: v.provider,
    byGender: v.byGender,
    allDefaultIds: Array.from(v.allDefaultIds),
  }
}
