import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export type DomainOption = { id: string; slug: string; name: string }
export type AdvisorCategoryOption = { id: string; slug: string; name: string }
export type AiModelOption = { id: string; name: string; provider: string }

export type PersonaLookups = {
  domains: DomainOption[]
  advisorCategories: AdvisorCategoryOption[]
  aiModels: AiModelOption[]
}

/**
 * Fetches the FK lookup data needed to render persona form selects.
 * One round-trip via Promise.all; safe to call from RSC pages.
 */
export async function loadPersonaLookups(): Promise<PersonaLookups> {
  const supabase = await createSupabaseServerClient()
  const [domains, advisorCategories, aiModels] = await Promise.all([
    supabase
      .from("coaching_domains")
      .select("id, slug, name")
      .order("sort_order", { ascending: true }),
    supabase
      .from("advisor_categories")
      .select("id, slug, name")
      .order("name", { ascending: true }),
    supabase
      .from("ai_models")
      .select("id, name, provider")
      .eq("active", true)
      .order("name", { ascending: true }),
  ])

  return {
    domains: (domains.data ?? []) as DomainOption[],
    advisorCategories: (advisorCategories.data ?? []) as AdvisorCategoryOption[],
    aiModels: (aiModels.data ?? []) as AiModelOption[],
  }
}
