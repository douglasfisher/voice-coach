import { notFound } from "next/navigation"

import { requireAdminPage } from "@/lib/auth/require-admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { loadPersonaLookups } from "@/lib/personas/lookups"
import { personaRowToForm } from "@/lib/personas/mappers"
import { loadAvatarConfig } from "@/lib/avatars/config"
import { PersonaEditor } from "@/components/admin/personas/persona-editor"

export const metadata = { title: "Persona · Dialectica Admin" }
// DB-driven config (avatar options, lookups) must be re-read every visit so
// SQL changes to app_settings are reflected without a redeploy.
export const dynamic = "force-dynamic"

export default async function PersonaEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const ctx = await requireAdminPage()
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [{ data: persona, error }, lookups, avatarConfig] = await Promise.all([
    supabase.from("personas").select("*").eq("id", id).maybeSingle(),
    loadPersonaLookups(),
    loadAvatarConfig(),
  ])

  if (error) throw new Error(error.message)
  if (!persona) notFound()

  return (
    <PersonaEditor
      mode="edit"
      personaId={id}
      initialValues={personaRowToForm(persona)}
      lookups={lookups}
      avatarConfig={avatarConfig}
      actorRole={ctx.role}
    />
  )
}
