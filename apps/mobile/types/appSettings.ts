/**
 * Shapes of rows stored in the `app_settings` JSONB table that the
 * mobile app reads at runtime. Used by `hooks/useAppSetting.ts` to
 * type-check `useAppSetting('foo')` calls.
 *
 * Admin-side types that used to live here (AdminUserView, UsageStats,
 * ModelCost, etc.) were deleted along with the in-mobile admin
 * screens — admin work now happens in the web admin app
 * (`apps/admin/`).
 */

export interface DailyChallengeItem {
  question: string;
  topic: string;
  personaId: string;
  personaName: string;
}

export interface DailyChallengesBatch {
  challenges: DailyChallengeItem[];
  generatedAt: string;
  generatedDate: string;
}

export interface AvatarDraftConfig {
  prompt_template: string;
  negative_prompt: string;
  model: string;
  width: number;
  height: number;
  number_results: number;
  cfg_scale: number;
  scheduler: string;
}

export interface AvatarHiresConfig {
  prompt_template: string;
  style: string;
  grading: string;
  film: string;
  skin: string;
  retouching: string;
  mood: string;
  detail: string;
  negative_prompt: string;
  model: string;
  width: number;
  height: number;
  /** @deprecated Legacy field — use prompt_template + composable options instead */
  prompt?: string;
}

export interface AvatarGenerationConfig {
  draft: AvatarDraftConfig;
  hires: AvatarHiresConfig;
}

/**
 * Shape of app_settings.ai_persona_generator. Kept here so mobile can
 * read it (web admin writes it). Migration 078 is the canonical schema.
 *
 * Templates use {{token}} placeholders; the renderer also supports
 * {{var|or 'fallback'}} for graceful empty-field handling.
 */
export interface AiPersonaGeneratorConfig {
  model_settings: {
    temperature: number;
    max_completion_tokens: number;
  };
  details: {
    system: string;
    user_template: string;
  };
  system_prompt: {
    system: string;
    user_template: string;
  };
  sections: {
    _system: string;
    identity: string;
    character_traits: string;
    roleplay_behavior: string;
    coaching_approach: string;
  };
  persona_context_template: string;
}

export interface AppSettingsMap {
  default_model: string;
  max_tokens_per_request: number;
  daily_token_limit_free: number;
  daily_token_limit_premium: number;
  maintenance_mode: boolean;
  featured_persona_id: string | null;
  cost_markup_percent: number;
  unified_card_gradient: boolean;
  challenge_show_persona_image: boolean;
  daily_challenges_batch: DailyChallengesBatch | null;
  fullscreen_card_mode: boolean;
  focus_mode_chat: boolean;
  ai_avatar_config: AvatarGenerationConfig | null;
  ai_persona_generator: AiPersonaGeneratorConfig | null;
}
