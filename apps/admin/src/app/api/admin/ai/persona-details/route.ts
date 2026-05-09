import { z } from "zod"

import { requireAdminApi } from "@/lib/auth/require-admin"
import { audit } from "@/lib/audit"
import { aiComplete } from "@/lib/ai/complete"
import { renderTemplate } from "@/lib/ai/render-prompt"
import {
  CHALLENGE_STYLES,
  COACHING_STYLES,
  PERSONA_TYPES,
} from "@/lib/personas/constants"
import { loadPersonaGeneratorConfig } from "@/lib/personas/generator-config"
import { buildContextVars } from "@/lib/personas/generator-context"

/**
 * POST /api/admin/ai/persona-details
 *
 * Generates the 11 identity fields PLUS matching avatar params as a single
 * JSON object. Same prompts as mobile (DB-driven, app_settings.ai_persona_
 * generator) but the web admin can additionally pass `constraints` from
 * the pre-flight selects (gender, type, age, ethnicity, appearance) which
 * the AI is instructed to respect.
 */

const formSnapshotSchema = z.object({
  name: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  cultural_background: z.string().nullable().optional(),
  persona_type: z.string().optional(),
  coaching_style: z.string().nullable().optional(),
  challenge_style: z.string().nullable().optional(),
  feedback_style: z.string().nullable().optional(),
  warmth: z.number().optional(),
  directness: z.number().optional(),
  patience: z.number().optional(),
  humor: z.number().optional(),
  formality: z.number().optional(),
  gender: z.string().optional(),
  age_range: z.string().nullable().optional(),
  avatar_params: z
    .object({
      params: z.object({
        gender: z.string(),
        age_range: z.string(),
        ethnicity: z.string(),
        appearance: z.string(),
        lighting: z.string(),
        clothing: z.string(),
        expression: z.string(),
        accessories: z.array(z.string()),
        pose: z.string(),
        camera: z.string(),
      }),
      prompt: z.string(),
    })
    .nullable()
    .optional(),
})

/**
 * Pre-flight constraints set in the Generate-persona dialog. Each is
 * optional; only the populated ones are rendered into the {{constraints}}
 * block of the user template. The AI is instructed to respect them.
 */
const constraintsSchema = z
  .object({
    gender: z.enum(["male", "female"]).optional(),
    persona_type: z.enum(PERSONA_TYPES).optional(),
    age_range: z.string().optional(),
    ethnicity: z.string().optional(),
    appearance: z.string().optional(),
  })
  .optional()

const bodySchema = z.object({
  form: formSnapshotSchema,
  /** Free-text concept hint, appended below the constraints block. */
  concept: z.string().trim().max(500).optional(),
  constraints: constraintsSchema,
  context: z
    .object({ personaId: z.string().uuid().optional() })
    .optional(),
})

/** AI-output schema. The avatar block is optional — older mobile prompts
 * don't include it, but every new web request goes through migration 079's
 * template which does. */
const avatarOutputSchema = z
  .object({
    gender: z.string(),
    age_range: z.string(),
    ethnicity: z.string(),
    appearance: z.string(),
    lighting: z.string(),
    clothing: z.string(),
    expression: z.string(),
    accessories: z.array(z.string()).min(1),
    pose: z.string(),
    camera: z.string(),
  })
  .optional()

const detailsOutputSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  cultural_background: z.string().optional(),
  coaching_style: z.enum(
    COACHING_STYLES.map((s) => s.value) as [string, ...string[]]
  ),
  challenge_style: z.enum(
    CHALLENGE_STYLES.map((s) => s.value) as [string, ...string[]]
  ),
  warmth: z.number().int().min(0).max(100),
  directness: z.number().int().min(0).max(100),
  patience: z.number().int().min(0).max(100),
  humor: z.number().int().min(0).max(100),
  formality: z.number().int().min(0).max(100),
  avatar: avatarOutputSchema,
})

function buildConstraintsBlock(
  c: NonNullable<z.infer<typeof constraintsSchema>>
): string {
  const lines: string[] = []
  if (c.gender) lines.push(`- Gender MUST be exactly: ${c.gender}`)
  if (c.persona_type)
    lines.push(`- Persona type MUST be exactly: ${c.persona_type}`)
  if (c.age_range)
    lines.push(`- Age range MUST be exactly: ${c.age_range}`)
  if (c.ethnicity)
    lines.push(`- Ethnicity MUST be exactly: ${c.ethnicity}`)
  if (c.appearance)
    lines.push(`- Appearance MUST be exactly: ${c.appearance}`)
  if (lines.length === 0) return ""
  return `Hard constraints (the generated persona MUST match these — do not deviate):\n${lines.join("\n")}`
}

export async function POST(req: Request) {
  const gate = await requireAdminApi()
  if (!gate.ok) return gate.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const config = await loadPersonaGeneratorConfig()
  // Constraints take precedence over current form values for the rendered
  // avatar context — i.e. if the user picked "female" in the dialog the
  // template's `Avatar: ... female` line reflects that even if the form's
  // gender is still the default. The AI's output is then validated to
  // respect the same constraints below.
  const constraints = parsed.data.constraints ?? {}
  const baseVars = buildContextVars(parsed.data.form)
  const vars: Record<string, string | number> = {
    ...baseVars,
    gender: constraints.gender ?? baseVars.gender,
    age_range: constraints.age_range ?? baseVars.age_range,
    ethnicity: constraints.ethnicity ?? baseVars.ethnicity,
    persona_type: constraints.persona_type ?? baseVars.persona_type,
    constraints: buildConstraintsBlock(constraints),
  }
  let userPrompt = renderTemplate(config.details.userTemplate, vars)
  if (parsed.data.concept) {
    userPrompt = `${userPrompt}\n\nConcept hint: ${parsed.data.concept}`
  }

  const result = await aiComplete({
    systemPrompt: config.details.system,
    userPrompt,
    settings: config.modelSettings,
  })
  if (!result.ok) {
    return Response.json(
      { error: result.error, message: result.message, detail: result.detail },
      { status: result.status }
    )
  }

  // Mobile's exact extraction: first {...} block, JSON.parse, then we
  // additionally validate with zod so callers get a typed patch.
  const jsonMatch = result.content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return Response.json(
      { error: "invalid_ai_response", message: "no JSON in response" },
      { status: 502 }
    )
  }
  let raw: unknown
  try {
    raw = JSON.parse(jsonMatch[0])
  } catch (err) {
    return Response.json(
      {
        error: "invalid_ai_response",
        message: err instanceof Error ? err.message : "JSON parse failed",
      },
      { status: 502 }
    )
  }
  const validated = detailsOutputSchema.safeParse(raw)
  if (!validated.success) {
    return Response.json(
      {
        error: "invalid_ai_response",
        message: "AI output failed schema validation",
        issues: validated.error.issues,
      },
      { status: 502 }
    )
  }

  // Cross-validate: the AI sometimes drifts from a stated constraint despite
  // the prompt. If any constraint was set and the avatar block doesn't
  // match, we don't fail the request — but we override the avatar field with
  // the constraint so downstream rendering stays coherent. Identity-side
  // gender/age_range come from the avatar block via the form mapping below.
  if (validated.data.avatar) {
    if (constraints.gender) validated.data.avatar.gender = constraints.gender
    if (constraints.age_range)
      validated.data.avatar.age_range = constraints.age_range
    if (constraints.ethnicity)
      validated.data.avatar.ethnicity = constraints.ethnicity
    if (constraints.appearance)
      validated.data.avatar.appearance = constraints.appearance
  }

  await audit(gate.ctx, {
    action: "persona_generator.details",
    targetTable: parsed.data.context?.personaId ? "personas" : undefined,
    targetId: parsed.data.context?.personaId ?? null,
    diff: {
      before: null,
      after: {
        constraints: parsed.data.constraints ?? null,
        fields: validated.data,
        chars: result.content.length,
      },
    },
  })

  // Return the response with persona_type echoed when it was a constraint —
  // makes life easier for the client which needs to setValue("persona_type").
  return Response.json({
    data: {
      ...validated.data,
      persona_type: constraints.persona_type ?? null,
    },
  })
}
