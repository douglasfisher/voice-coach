import { notFound } from "next/navigation"

import { requireAdminPage } from "@/lib/auth/require-admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { loadPersonaLookups } from "@/lib/personas/lookups"
import { personaRowToForm } from "@/lib/personas/mappers"
import { PersonaEditor } from "@/components/admin/personas/persona-editor"

export const metadata = { title: "Persona · Dialectica Admin" }

export default async function PersonaEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const ctx = await requireAdminPage()
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [{ data: persona, error }, lookups] = await Promise.all([
    supabase.from("personas").select("*").eq("id", id).maybeSingle(),
    loadPersonaLookups(),
  ])

  if (error) throw new Error(error.message)
  if (!persona) notFound()

  return (
    <PersonaEditor
      mode="edit"
      personaId={id}
      initialValues={personaRowToForm(persona)}
      lookups={lookups}
      actorRole={ctx.role}
    />
  )
}
