import { requireAdminPage } from "@/lib/auth/require-admin"
import { loadPersonaLookups } from "@/lib/personas/lookups"
import { loadAvatarConfig } from "@/lib/avatars/config"
import { DEFAULT_PERSONA } from "@/lib/personas/schema"
import { PersonaEditor } from "@/components/admin/personas/persona-editor"

export const metadata = { title: "New persona · Dialectica Admin" }
export const dynamic = "force-dynamic"

export default async function NewPersonaPage() {
  const ctx = await requireAdminPage()
  const [lookups, avatarConfig] = await Promise.all([
    loadPersonaLookups(),
    loadAvatarConfig(),
  ])

  return (
    <PersonaEditor
      mode="create"
      initialValues={DEFAULT_PERSONA}
      lookups={lookups}
      avatarConfig={avatarConfig}
      actorRole={ctx.role}
    />
  )
}
