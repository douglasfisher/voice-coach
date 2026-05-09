/**
 * Persona-related shared shapes.
 *
 * The DB stores `personas.ai_config` as JSONB so the generated
 * Database types surface it as `Json | null`. Both apps actually need
 * a typed inner shape — this is that contract.
 */

export interface PersonaAIConfig {
  model?: string
  fallback_model?: string | null
  temperature?: number
  top_p?: number
  max_completion_tokens?: number
  stop?: string[]
  cost_per_million_input?: number
  cost_per_million_output?: number
}

/** Narrow an unknown JSON value into PersonaAIConfig. Returns an empty
 * object for null / non-object inputs so callers can read `cfg.model`
 * without nullish-checks. Mirrors `readAiConfig` in
 * apps/admin/src/lib/personas/mappers.ts. */
export function readPersonaAIConfig(value: unknown): PersonaAIConfig {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as PersonaAIConfig
  }
  return {}
}
