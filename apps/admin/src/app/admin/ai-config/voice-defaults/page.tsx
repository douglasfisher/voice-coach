import { requireAdminPage } from "@/lib/auth/require-admin"
import { loadVoiceDefaults } from "@/lib/personas/voice-defaults"
import { VoiceDefaultsEditor } from "./editor"

export const metadata = {
  title: "Voice defaults · AI config · Dialectica Admin",
}
export const dynamic = "force-dynamic"

export default async function VoiceDefaultsConfigPage() {
  await requireAdminPage()
  const defaults = await loadVoiceDefaults()
  return (
    <VoiceDefaultsEditor
      initial={{
        provider: defaults.provider,
        byGender: defaults.byGender,
        allDefaultIds: Array.from(defaults.allDefaultIds),
      }}
    />
  )
}
