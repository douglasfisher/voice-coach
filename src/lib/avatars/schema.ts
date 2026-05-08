import { z } from "zod"

// Validates a request envelope; the *option arrays* live in app_settings,
// so we don't enum-check individual values server-side. The client picks
// from the DB-provided lists, and Runware tolerates new strings — strict
// validation here would force a deploy each time the DB options change.
export const avatarParamsSchema = z.object({
  gender: z.string().min(1).max(40),
  age_range: z.string().min(1).max(40),
  ethnicity: z.string().min(1).max(80),
  appearance: z.string().min(1).max(120),
  lighting: z.string().min(1).max(200),
  clothing: z.string().min(1).max(80),
  expression: z.string().min(1).max(80),
  accessories: z.array(z.string().min(1).max(40)).min(1).max(8),
  pose: z.string().min(1).max(60),
  camera: z.string().min(1).max(120),
})

export const generateRequestSchema = z.object({
  // The form's editable prompt — usually buildPromptFromParams(params) but
  // the user can hand-edit before submitting.
  prompt: z.string().trim().min(10).max(2000),
  // Params are sent for audit/logging only — Runware uses the prompt.
  params: avatarParamsSchema,
})

export const upscaleRequestSchema = z.object({
  draftUrl: z.string().url(),
})
