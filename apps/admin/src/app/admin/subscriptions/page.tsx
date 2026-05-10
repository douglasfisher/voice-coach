import { PageHeader } from "@/components/admin/page-header"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import { TierMetadataEditor } from "./tier-metadata-editor"
import { FeatureMatrixEditor } from "./feature-matrix-editor"

export const metadata = { title: "Subscriptions · Dialectica Admin" }
// Re-read on every visit; the matrix is admin-edited and we want
// freshness on save+navigate.
export const dynamic = "force-dynamic"

type FeatureFlag =
  Database["public"]["Tables"]["feature_flags"]["Row"]
type TierMetadata =
  Database["public"]["Tables"]["tier_metadata"]["Row"]
type TierFeature =
  Database["public"]["Tables"]["tier_features"]["Row"]

async function loadAll() {
  const supabase = await createSupabaseServerClient()
  const [flagsRes, metaRes, overridesRes] = await Promise.all([
    supabase
      .from("feature_flags")
      .select("*")
      .eq("deprecated", false)
      .order("feature_group", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase
      .from("tier_metadata")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase.from("tier_features").select("*"),
  ])
  if (flagsRes.error) throw new Error(flagsRes.error.message)
  if (metaRes.error) throw new Error(metaRes.error.message)
  if (overridesRes.error) throw new Error(overridesRes.error.message)
  return {
    flags: (flagsRes.data ?? []) as FeatureFlag[],
    metas: (metaRes.data ?? []) as TierMetadata[],
    overrides: (overridesRes.data ?? []) as TierFeature[],
  }
}

export default async function SubscriptionsPage() {
  const ctx = await requireAdminPage()
  const { flags, metas, overrides } = await loadAll()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Subscriptions"
        description="Tier display, pricing, and the feature × tier matrix that gates every capability in the app. Resolution is additive — each tier inherits everything from the lower tier unless you set an explicit override here."
      />

      <section>
        <h2 className="mb-2 text-lg font-semibold">Tiers</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Display name, pricing, and marketing copy per tier. Price + visibility
          changes are superadmin-only.
        </p>
        <TierMetadataEditor metas={metas} canEditCommercial={ctx.role === "superadmin"} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Feature matrix</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Each cell shows the value the user&apos;s tier resolves to. Empty
          cell = inherits from a lower tier (or the catalogue default).
          Click a cell to set or clear an override.
        </p>
        <FeatureMatrixEditor
          flags={flags}
          metas={metas}
          overrides={overrides}
        />
      </section>
    </div>
  )
}
