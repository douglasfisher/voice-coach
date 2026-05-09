/**
 * Helpers that turn a partial PersonaFormValues + the saved avatar params
 * into the variables expected by the persona generator templates. Shared
 * by the three new admin AI routes.
 *
 * The shape mirrors mobile's wizardStore: identity fields live on
 * formData; gender/age_range/ethnicity/expression/clothing/accessories
 * live on the avatar params block.
 */

/** Loose snapshot of the form fields used by the persona generator. The
 * routes accept partial values (nullable + optional) because the form may
 * be in any state when generation fires — even brand-new personas with
 * empty fields are valid input, so missing fields render as empty in the
 * prompt rather than failing the request. */
export type FormSnapshot = {
  name?: string | null
  tagline?: string | null
  cultural_background?: string | null
  persona_type?: string
  coaching_style?: string | null
  challenge_style?: string | null
  feedback_style?: string | null
  warmth?: number
  directness?: number
  patience?: number
  humor?: number
  formality?: number
  gender?: string
  age_range?: string | null
  avatar_params?: {
    params: {
      gender: string
      age_range: string
      ethnicity: string
      appearance: string
      lighting: string
      clothing: string
      expression: string
      accessories: string[]
      pose: string
      camera: string
    }
    prompt: string
  } | null
}

/** Merges form values + avatar params into the {{token}} dictionary the
 * mobile-parity templates expect. */
export function buildContextVars(
  form: FormSnapshot
): Record<string, string | number> {
  const ap = form.avatar_params?.params
  const accessoriesArr = ap?.accessories ?? []
  const accessoriesText =
    accessoriesArr.length === 0 || accessoriesArr.every((a) => a === "none")
      ? "none"
      : accessoriesArr.filter((a) => a !== "none").join(", ")

  return {
    // Identity fields
    name: form.name ?? "",
    tagline: form.tagline ?? "",
    cultural_background: form.cultural_background ?? "",
    persona_type: form.persona_type ?? "",
    coaching_style: form.coaching_style ?? "",
    challenge_style: form.challenge_style ?? "",
    feedback_style: form.feedback_style ?? "",
    warmth: form.warmth ?? 0,
    directness: form.directness ?? 0,
    patience: form.patience ?? 0,
    humor: form.humor ?? 0,
    formality: form.formality ?? 0,

    // Avatar context — prefer avatar_params, fall back to identity overlap.
    age_range: ap?.age_range ?? form.age_range ?? "",
    ethnicity: ap?.ethnicity ?? "",
    gender: ap?.gender ?? form.gender ?? "",
    expression: ap?.expression ?? "",
    clothing: ap?.clothing ?? "",
    accessories: accessoriesText,
  }
}
