/**
 * Catalogue of AI-related app_settings rows the admin UI surfaces.
 *
 * Single source of truth: the landing page shows a card per entry,
 * routes the "Edit" link to the typed editor when one exists, and
 * falls back to the raw JSON editor at /admin/ai-config/raw/[key] when
 * no typed editor has been built yet. Adding a new app_settings key
 * = one line here.
 *
 * `editor: 'typed'` means we have a hand-built form (e.g.
 * /admin/ai-config/persona-generator). `editor: 'raw'` falls back to
 * the JSON editor.
 *
 * The "type" column is informational — it tells the admin what shape
 * to expect when they open the raw editor.
 */

export type ConfigEditor = "typed" | "raw"

export interface ConfigEntry {
  key: string
  title: string
  /** Short admin-facing description. Two sentences max. */
  description: string
  /** Rough shape — informational only. */
  type: "object" | "string" | "number" | "boolean" | "array"
  /** Group used to bucket cards on the landing page. */
  group: "Prompts" | "Generation" | "Tasks" | "Features" | "Operational"
  editor: ConfigEditor
  /** Where the typed editor lives, if any. Otherwise omitted and the
   *  landing card links to /admin/ai-config/raw/[key]. */
  href?: string
}

export const CATALOGUE: readonly ConfigEntry[] = [
  // -------- Prompts (free-text or template-heavy strings) --------
  {
    key: "ai_report_prompt",
    title: "Session report prompt",
    description:
      "System prompt used to generate the post-session report (TLDR, strengths, weaknesses, detailed analysis, score).",
    type: "string",
    group: "Prompts",
    editor: "raw",
  },
  {
    key: "ai_challenge_prompt",
    title: "Daily challenge prompt",
    description:
      "Prompt used by the chat fn to generate the daily challenge batch (10 questions across topics).",
    type: "string",
    group: "Prompts",
    editor: "raw",
  },
  {
    key: "ai_scene_template",
    title: "Global scene template",
    description:
      "Wrapper template applied to per-persona qa_scenario_prompts. Personas can override via personas.qa_scene_template.",
    type: "string",
    group: "Prompts",
    editor: "raw",
  },
  {
    key: "ai_coaching_prompts",
    title: "Coaching prompts",
    description:
      "Coaching styles, interaction modes, feedback styles, and phase definitions consumed by the chat fn's resolver.",
    type: "object",
    group: "Prompts",
    editor: "raw",
  },
  {
    key: "ai_emotional_progressions",
    title: "Emotional progressions",
    description:
      "Demeanour stage maps (shy / confident / uninterested / etc.) plus the [STATE:X:NAME] template used to track per-message emotional state.",
    type: "object",
    group: "Prompts",
    editor: "raw",
  },
  {
    key: "ai_response_style",
    title: "Response style rules",
    description:
      "Tone, brevity, max sentences, question-inclusion preferences. Mixed in to the system prompt at request time.",
    type: "object",
    group: "Prompts",
    editor: "raw",
  },
  {
    key: "ai_system_modifiers",
    title: "System modifiers",
    description:
      "Global persona-adherence + safety + brevity instructions appended to every system prompt.",
    type: "object",
    group: "Prompts",
    editor: "raw",
  },

  // -------- Generation (persona / avatar / voice meta-prompts) --------
  {
    key: "ai_persona_generator",
    title: "Persona generator",
    description:
      "Meta-prompts used when 'Generate persona' creates a brand-new persona via AI.",
    type: "object",
    group: "Generation",
    editor: "typed",
    href: "/admin/ai-config/persona-generator",
  },
  {
    key: "ai_avatar_config",
    title: "Avatar generation config",
    description:
      "Draft + hi-res prompt templates, model choice, dimensions, and post-processing options for AI-generated avatars.",
    type: "object",
    group: "Generation",
    editor: "raw",
  },
  {
    key: "ai_avatar_options",
    title: "Avatar options catalogue",
    description:
      "The age / ethnicity / clothing / lighting etc. options exposed in the avatar wizard.",
    type: "object",
    group: "Generation",
    editor: "raw",
  },
  {
    key: "ai_avatar_composition",
    title: "Avatar composition guide",
    description:
      "Silhouette + safe-zone overlay drawn on top of avatar drafts and inside the crop modal.",
    type: "object",
    group: "Generation",
    editor: "typed",
    href: "/admin/ai-config/avatar-composition",
  },
  {
    key: "ai_voice_defaults",
    title: "Voice defaults",
    description:
      "Default ElevenLabs voice IDs auto-picked when a persona is created. Per gender, with manual-override preservation.",
    type: "object",
    group: "Generation",
    editor: "typed",
    href: "/admin/ai-config/voice-defaults",
  },

  // -------- Tasks (per-task model + temperature config) --------
  {
    key: "ai_default_settings",
    title: "AI default settings",
    description:
      "Model, temperature, top_p, presence/frequency penalties applied when a persona / task doesn't override them.",
    type: "object",
    group: "Tasks",
    editor: "raw",
  },
  {
    key: "ai_task_settings",
    title: "Per-task settings",
    description:
      "Task-level overrides (chat / report / scenario / challenge / analysis). Each task can pick a different model + sampling settings.",
    type: "object",
    group: "Tasks",
    editor: "raw",
  },

  // -------- Features --------
  {
    key: "ai_features",
    title: "AI feature toggles",
    description:
      "Boolean toggles for analysis_enabled, report_generation_enabled, streaming_enabled. Predates the tier_features matrix and is read by the chat fn directly.",
    type: "object",
    group: "Features",
    editor: "raw",
  },

  // -------- Operational --------
  {
    key: "maintenance_mode",
    title: "Maintenance mode",
    description:
      "Boolean. When true the mobile app shows a maintenance banner; admin paths still work.",
    type: "boolean",
    group: "Operational",
    editor: "raw",
  },
  {
    key: "featured_persona_id",
    title: "Featured persona",
    description:
      "Persona ID surfaced as 'featured' on the home screen. null = no featured persona.",
    type: "string",
    group: "Operational",
    editor: "raw",
  },
  {
    key: "cost_markup_percent",
    title: "Cost markup percent",
    description:
      "Multiplier applied when displaying AI cost to admins. 0 = show raw provider cost.",
    type: "number",
    group: "Operational",
    editor: "raw",
  },
]

export function isKeyAllowed(key: string): boolean {
  return CATALOGUE.some((c) => c.key === key)
}

export const GROUPS: ConfigEntry["group"][] = [
  "Prompts",
  "Generation",
  "Tasks",
  "Features",
  "Operational",
]
