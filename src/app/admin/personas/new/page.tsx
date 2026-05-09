import { requireAdminPage } from "@/lib/auth/require-admin"
import { loadPersonaLookups } from "@/lib/personas/lookups"
import { loadAvatarConfig } from "@/lib/avatars/config"
import {
  loadVoiceDefaults,
  toClient as toClientVoiceDefaults,
} from "@/lib/personas/voice-defaults"
import { DEFAULT_PERSONA } from "@/lib/personas/schema"
import { PersonaEditor } from "@/components/admin/personas/persona-editor"

export const metadata = { title: "New persona · Dialectica Admin" }
export const dynamic = "force-dynamic"

export default async function NewPersonaPage() {
  const ctx = await requireAdminPage()
  const [lookups, avatarConfig, voiceDefaults] = await Promise.all([
    loadPersonaLookups(),
    loadAvatarConfig(),
    loadVoiceDefaults(),
  ])

  // Pre-fill voice_id from the gender default so create flow doesn't open
  // with a "Voice ID is required" red field.
  const initialValues = {
    ...DEFAULT_PERSONA,
    voice_provider:
      (voiceDefaults.provider as typeof DEFAULT_PERSONA.voice_provider) ??
      DEFAULT_PERSONA.voice_provider,
    voice_id:
      voiceDefaults.byGender[DEFAULT_PERSONA.gender] ?? DEFAULT_PERSONA.voice_id,
  }

  return (
    <PersonaEditor
      mode="create"
      initialValues={initialValues}
      lookups={lookups}
      avatarConfig={avatarConfig}
      voiceDefaults={toClientVoiceDefaults(voiceDefaults)}
      actorRole={ctx.role}
    />
  )
}
