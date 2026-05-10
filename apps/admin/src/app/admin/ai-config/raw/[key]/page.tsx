import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/admin/page-header"
import { Button } from "@/components/ui/button"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { CATALOGUE, isKeyAllowed } from "../../config-catalogue"
import { RawJsonEditor } from "./raw-editor"

export const metadata = { title: "AI config · raw · Dialectica Admin" }
export const dynamic = "force-dynamic"

export default async function RawConfigPage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  await requireAdminPage()
  const { key } = await params
  if (!isKeyAllowed(key)) notFound()

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) notFound()

  const meta = CATALOGUE.find((c) => c.key === key)

  return (
    <div>
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/ai-config" />}
        >
          <ArrowLeft className="mr-1 size-4" /> Back to AI config
        </Button>
      </div>

      <PageHeader
        title={meta?.title ?? key}
        description={
          meta?.description ??
          "Raw JSON editor. The full row is replaced with whatever you save here, so be careful — mistakes can break AI behaviour app-wide. The audit log keeps a copy of the previous value if you need to revert."
        }
      />

      <RawJsonEditor
        configKey={key}
        initialValue={data.value}
        updatedAt={data.updated_at}
      />
    </div>
  )
}
