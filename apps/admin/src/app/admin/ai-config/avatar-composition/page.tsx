import { requireAdminPage } from "@/lib/auth/require-admin"
import { loadAvatarComposition } from "@/lib/avatars/composition"
import { CompositionEditor } from "./composition-editor"

export const metadata = {
  title: "Avatar composition · AI config · Dialectica Admin",
}
export const dynamic = "force-dynamic"

export default async function AvatarCompositionPage() {
  await requireAdminPage()
  const composition = await loadAvatarComposition()
  return <CompositionEditor initial={composition} />
}
