/**
 * Feature catalogue + tier configuration.
 *
 * Two layers:
 *  - The CATALOGUE (this file) is code-shaped — adding/removing a feature
 *    requires a code change AND a migration row. This keeps gates and
 *    the keys they reference type-checked end-to-end.
 *  - The TIER OVERRIDES + tier display metadata live in the DB
 *    (`tier_features` and `tier_metadata` tables) and are admin-tunable
 *    without a deploy.
 *
 * Every gate in the codebase resolves a key from this catalogue against
 * the user's tier. The resolution function (in code) walks the tier
 * hierarchy free → freemium → basic → pro → enterprise → team and takes
 * the last-write-wins override per key, falling back to the catalogue's
 * `default_value`. So tiers ARE additive by virtue of the resolver,
 * even though storage is per-tier overrides (admins only enter what
 * changes at each level).
 */

export const SUBSCRIPTION_TIERS = [
  "free",
  "freemium",
  "basic",
  "pro",
  "enterprise",
  "team",
] as const

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number]

/**
 * Tier order used by the resolver. Higher index = higher tier. Anything
 * an admin sets at a lower tier carries up unless explicitly overridden.
 */
export const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  freemium: 1,
  basic: 2,
  pro: 3,
  enterprise: 4,
  team: 5,
}

export type FeatureKind = "boolean" | "number"

/**
 * Feature catalogue entry. The `default_value` is what every tier
 * inherits if no override exists at any level — typically the most
 * restrictive value (false for booleans, 0 / a small number for quotas).
 */
export interface FeatureDefinition {
  key: string
  kind: FeatureKind
  /** Default if no tier override exists. Type matches `kind`. */
  default_value: boolean | number
  /** Display label for the admin matrix. Editable in DB. */
  name: string
  /** Longer help text shown on the admin matrix row. Editable in DB. */
  description: string
  /** Grouping label for the admin matrix (e.g. "Quotas", "Voice"). */
  group:
    | "Quotas"
    | "Personas & content"
    | "Voice"
    | "Analysis & reporting"
    | "Productivity"
    | "Models"
    | "Future"
    | "Team"
  /** Sort key within the group on the admin matrix. */
  sort_order: number
  /**
   * Special semantics for numeric quotas: a value of `null` (encoded as
   * JSONB null) means "unlimited" — typically the top-tier value.
   * Booleans don't use this.
   */
}

/**
 * The catalogue. Order in this array is the seed sort order; group
 * also acts as a section in the admin matrix.
 */
export const FEATURE_CATALOGUE: FeatureDefinition[] = [
  // -------- Quotas --------
  {
    key: "daily_tokens",
    kind: "number",
    default_value: 5_000,
    name: "Daily AI tokens",
    description:
      "Hard cap on combined input + output tokens per UTC day. The chat edge function refuses with 429 when exceeded. Existing ai_tier_limits row is folded into this feature.",
    group: "Quotas",
    sort_order: 10,
  },
  {
    key: "max_lifetime_sessions",
    kind: "number",
    default_value: 5,
    name: "Lifetime sessions",
    description:
      "Hard cap on conversations the account has ever started. Set to null for unlimited at higher tiers.",
    group: "Quotas",
    sort_order: 20,
  },
  {
    key: "max_conversations_per_day",
    kind: "number",
    default_value: 1,
    name: "Conversations per day",
    description:
      "Cap on session starts per UTC day. Independent of the lifetime cap.",
    group: "Quotas",
    sort_order: 30,
  },
  {
    key: "max_messages_per_conversation",
    kind: "number",
    default_value: 20,
    name: "Messages per conversation",
    description:
      "Hard limit on the length of a single session before it's auto-ended.",
    group: "Quotas",
    sort_order: 40,
  },
  {
    key: "max_favourite_personas",
    kind: "number",
    default_value: 1,
    name: "Favourite personas",
    description: "How many personas the user can pin/favourite.",
    group: "Quotas",
    sort_order: 50,
  },
  {
    key: "history_retention_days",
    kind: "number",
    default_value: 7,
    name: "History retention (days)",
    description:
      "Conversations older than this are auto-deleted. null = forever.",
    group: "Quotas",
    sort_order: 60,
  },
  {
    key: "concurrent_active_conversations",
    kind: "number",
    default_value: 1,
    name: "Concurrent active sessions",
    description:
      "How many conversations the user can have in status=active at once.",
    group: "Quotas",
    sort_order: 70,
  },

  // -------- Personas & content --------
  {
    key: "max_coach_personas_visible",
    kind: "number",
    default_value: 1,
    name: "Coach personas visible",
    description:
      "How many coach personas the user can browse and start sessions with.",
    group: "Personas & content",
    sort_order: 10,
  },
  {
    key: "max_coaching_domains",
    kind: "number",
    default_value: 1,
    name: "Coaching domains",
    description:
      "How many domains (dating / interviews / negotiations / etc.) the user can access.",
    group: "Personas & content",
    sort_order: 20,
  },
  {
    key: "challenger_personas_enabled",
    kind: "boolean",
    default_value: false,
    name: "Challenger personas",
    description:
      "Counterpart-simulation personas (the marquee differentiator from competitors). Gate at pro per the May 2026 competitive analysis.",
    group: "Personas & content",
    sort_order: 30,
  },
  {
    key: "advisor_mode_enabled",
    kind: "boolean",
    default_value: false,
    name: "Advisor mode",
    description: "Access to advisor personas with intake-style flows.",
    group: "Personas & content",
    sort_order: 40,
  },
  {
    key: "qa_mode_enabled",
    kind: "boolean",
    default_value: true,
    name: "Q&A mode",
    description:
      "User-leads interaction mode (vs default Practice mode). On for everyone — it's a Dialectica-specific differentiator.",
    group: "Personas & content",
    sort_order: 50,
  },
  {
    key: "daily_challenges_enabled",
    kind: "boolean",
    default_value: true,
    name: "Daily challenges",
    description:
      "Daily challenge feed on the home screen. Free-friendly retention loop.",
    group: "Personas & content",
    sort_order: 60,
  },
  {
    key: "custom_scenarios_enabled",
    kind: "boolean",
    default_value: false,
    name: "Custom scenario authoring",
    description:
      "User-authored scenarios (parity with Tough Tongue AI / VirtualSpeech Roleplay Studio).",
    group: "Personas & content",
    sort_order: 70,
  },

  // -------- Voice --------
  {
    key: "voice_input_enabled",
    kind: "boolean",
    default_value: false,
    name: "Voice input (STT)",
    description:
      "Speech-to-text input. Standard tier minimum per market norms.",
    group: "Voice",
    sort_order: 10,
  },
  {
    key: "voice_output_enabled",
    kind: "boolean",
    default_value: false,
    name: "Voice output (TTS)",
    description:
      "Text-to-speech playback of assistant messages. Standard tier minimum.",
    group: "Voice",
    sort_order: 20,
  },
  {
    key: "priority_voice_quality",
    kind: "boolean",
    default_value: false,
    name: "Priority voice quality",
    description:
      "Premium ElevenLabs voice tier vs default model. Premium upsell.",
    group: "Voice",
    sort_order: 30,
  },

  // -------- Models --------
  {
    key: "priority_models_enabled",
    kind: "boolean",
    default_value: false,
    name: "Priority AI models",
    description:
      "Routes to the higher-tier model in app_settings.ai_coaching_prompts. Premium upsell.",
    group: "Models",
    sort_order: 10,
  },

  // -------- Analysis & reporting --------
  {
    key: "performance_analysis_enabled",
    kind: "boolean",
    default_value: false,
    name: "Performance analysis card",
    description:
      "The session-report Performance Analysis card with derived insights.",
    group: "Analysis & reporting",
    sort_order: 10,
  },
  {
    key: "emotional_progression_enabled",
    kind: "boolean",
    default_value: false,
    name: "Emotional progression",
    description:
      "Per-persona dynamic emotional state across the conversation. Marquee differentiator — make sure paying users see it.",
    group: "Analysis & reporting",
    sort_order: 20,
  },
  {
    key: "emotional_journey_view_enabled",
    kind: "boolean",
    default_value: false,
    name: "Emotional journey view",
    description:
      "Stage trajectory + distribution + timeline in the session report. Premium upsell.",
    group: "Analysis & reporting",
    sort_order: 30,
  },
  {
    key: "detailed_analysis_enabled",
    kind: "boolean",
    default_value: false,
    name: "Detailed analysis section",
    description:
      "Long-form analysis paragraph in the session report (otherwise truncated).",
    group: "Analysis & reporting",
    sort_order: 40,
  },

  // -------- Productivity --------
  {
    key: "session_export_enabled",
    kind: "boolean",
    default_value: false,
    name: "Export transcripts",
    description: "Export conversation transcripts (markdown / PDF).",
    group: "Productivity",
    sort_order: 10,
  },

  // -------- Future (placeholders so we don't migrate later when shipped) --------
  {
    key: "filler_word_analytics_enabled",
    kind: "boolean",
    default_value: false,
    name: "Filler-word & pacing analytics",
    description:
      "Yoodli/Speeko-style WPM and filler counts. Not built yet — placeholder so we don't migrate when it ships.",
    group: "Future",
    sort_order: 10,
  },
  {
    key: "live_meeting_overlay_enabled",
    kind: "boolean",
    default_value: false,
    name: "Live meeting overlay",
    description:
      "Real-time desktop coach during Zoom/Meet/Teams calls (Poised / Yoodli flagship). Placeholder.",
    group: "Future",
    sort_order: 20,
  },
  {
    key: "video_avatars_enabled",
    kind: "boolean",
    default_value: false,
    name: "Video avatars",
    description:
      "Lifelike video persona avatars (Yoodli / VirtualSpeech parity). Placeholder.",
    group: "Future",
    sort_order: 30,
  },
  {
    key: "web_app_access",
    kind: "boolean",
    default_value: false,
    name: "Web app access",
    description:
      "Companion web client. Placeholder until built.",
    group: "Future",
    sort_order: 40,
  },

  // -------- Team --------
  {
    key: "team_admin_dashboard",
    kind: "boolean",
    default_value: false,
    name: "Team admin dashboard",
    description:
      "Org-level user/usage dashboard. Team tier only.",
    group: "Team",
    sort_order: 10,
  },
  {
    key: "team_sso_enabled",
    kind: "boolean",
    default_value: false,
    name: "SSO",
    description: "SAML / OIDC for org accounts. Enterprise/team.",
    group: "Team",
    sort_order: 20,
  },
  {
    key: "team_custom_scenarios",
    kind: "boolean",
    default_value: false,
    name: "Org-shared custom scenarios",
    description:
      "Custom scenarios authored by org admins, shared to all seats.",
    group: "Team",
    sort_order: 30,
  },
]

/** Build a quick lookup keyed by `key`. */
export const FEATURE_BY_KEY: Record<string, FeatureDefinition> = Object.freeze(
  Object.fromEntries(FEATURE_CATALOGUE.map((f) => [f.key, f]))
)

/**
 * Initial tier matrix. SEEDED into tier_features by the migration; admins
 * can edit it freely afterwards.
 *
 * Numeric `null` = "no enforced limit" / unlimited.
 * Missing keys = the tier inherits from the next-lower tier (or the
 * catalogue default if no lower override exists).
 */
export const INITIAL_TIER_MATRIX: Record<
  SubscriptionTier,
  Partial<Record<string, boolean | number | null>>
> = {
  free: {
    // Default-derived for many; explicit here only where stricter than
    // the catalogue default makes sense.
    daily_tokens: 5_000,
    max_lifetime_sessions: 5,
    max_conversations_per_day: 1,
    max_messages_per_conversation: 20,
    max_favourite_personas: 1,
    max_coach_personas_visible: 1,
    max_coaching_domains: 1,
    history_retention_days: 7,
    concurrent_active_conversations: 1,
    qa_mode_enabled: true,
    daily_challenges_enabled: true,
  },
  freemium: {
    daily_tokens: 25_000,
    max_lifetime_sessions: null, // unlimited from freemium up
    max_conversations_per_day: 3,
    max_messages_per_conversation: 50,
    max_favourite_personas: 3,
    max_coach_personas_visible: 6,
    max_coaching_domains: 2,
    history_retention_days: 30,
    performance_analysis_enabled: true,
  },
  basic: {
    daily_tokens: 200_000,
    max_conversations_per_day: null,
    max_messages_per_conversation: null,
    max_favourite_personas: null,
    max_coach_personas_visible: null,
    max_coaching_domains: null,
    history_retention_days: null,
    concurrent_active_conversations: 3,
    voice_input_enabled: true,
    voice_output_enabled: true,
    advisor_mode_enabled: true,
    emotional_progression_enabled: true,
    detailed_analysis_enabled: true,
  },
  pro: {
    daily_tokens: 1_000_000,
    concurrent_active_conversations: null,
    challenger_personas_enabled: true,
    custom_scenarios_enabled: true,
    priority_voice_quality: true,
    priority_models_enabled: true,
    emotional_journey_view_enabled: true,
    session_export_enabled: true,
  },
  enterprise: {
    daily_tokens: 5_000_000,
    team_sso_enabled: true,
  },
  team: {
    daily_tokens: 5_000_000,
    team_admin_dashboard: true,
    team_sso_enabled: true,
    team_custom_scenarios: true,
  },
}

/**
 * Walk the tier hierarchy and resolve a feature value for a given tier.
 *
 * `overridesByTier` is the DB-loaded matrix:
 *   Map<tier, Map<feature_key, value>>.
 *
 * Returns the effective value (boolean for boolean features, number for
 * numeric — `null` is preserved and signals "unlimited" to the caller).
 */
export function resolveFeatureValue(
  feature: FeatureDefinition,
  tier: SubscriptionTier,
  overridesByTier: Map<SubscriptionTier, Map<string, boolean | number | null>>
): boolean | number | null {
  const userRank = TIER_RANK[tier]
  let value: boolean | number | null = feature.default_value
  for (const t of SUBSCRIPTION_TIERS) {
    if (TIER_RANK[t] > userRank) break
    const tierOverrides = overridesByTier.get(t)
    if (!tierOverrides) continue
    if (tierOverrides.has(feature.key)) {
      const v = tierOverrides.get(feature.key)
      if (v !== undefined) value = v
    }
  }
  return value
}
