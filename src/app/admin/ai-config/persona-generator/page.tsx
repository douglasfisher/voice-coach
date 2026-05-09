import { requireAdminPage } from "@/lib/auth/require-admin"
import { loadPersonaGeneratorConfig } from "@/lib/personas/generator-config"
import { PersonaGeneratorEditor } from "./editor"

export const metadata = {
  title: "Persona generator · AI config · Dialectica Admin",
}
export const dynamic = "force-dynamic"

export default async function PersonaGeneratorConfigPage() {
  await requireAdminPage()
  const config = await loadPersonaGeneratorConfig()
  return <PersonaGeneratorEditor initial={config} />
}
