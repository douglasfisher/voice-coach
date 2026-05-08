import { requireAdminPage } from "@/lib/auth/require-admin"
import { loadPersonaLookups } from "@/lib/personas/lookups"
import { DEFAULT_PERSONA } from "@/lib/personas/schema"
import { PersonaEditor } from "@/components/admin/personas/persona-editor"

export const metadata = { title: "New persona · Dialectica Admin" }

export default async function NewPersonaPage() {
  const ctx = await requireAdminPage()
  const lookups = await loadPersonaLookups()

  return (
    <PersonaEditor
      mode="create"
      initialValues={DEFAULT_PERSONA}
      lookups={lookups}
      actorRole={ctx.role}
    />
  )
}
