/**
 * Per-message coaching analysis emitted by the chat edge function and
 * consumed by mobile (AnalysisCard) and admin (conversation viewer).
 *
 * The shape is the source of truth — the chat fn writes JSON matching
 * this interface to messages.analysis. Both apps reading from there
 * should import from this package.
 */

export type AnalysisItemType =
  | "fallacy"
  | "bias"
  | "gender_dynamic"
  | "racial_assumption"
  | "emotional"
  | "strength"

export type AnalysisSeverity = "minor" | "moderate" | "significant"

export interface AnalysisItemResult {
  type: AnalysisItemType
  code: string
  label: string
  severity: AnalysisSeverity
  excerpt: string
  explanation: string
  coaching: string
}

/** Backwards-compat alias — admin originally typed individual items as
 * `AnalysisItem`. */
export type AnalysisItem = AnalysisItemResult

export interface AnalysisResult {
  items: AnalysisItemResult[]
  overall_quality: number
  encouragement: string
}

/** Hex colours used by mobile to tint each analysis item type. Admin
 * uses Tailwind classes via its own colour map; both maps key off the
 * same AnalysisItemType so they can't drift in label. */
export const ANALYSIS_COLORS: Record<AnalysisItemType, string> = {
  fallacy: "#F87171",
  bias: "#FBBF24",
  gender_dynamic: "#A78BFA",
  racial_assumption: "#F472B6",
  emotional: "#FB923C",
  strength: "#34D399",
}

export const ANALYSIS_LABELS: Record<AnalysisItemType, string> = {
  fallacy: "Logical Fallacy",
  bias: "Cognitive Bias",
  gender_dynamic: "Gender Dynamic",
  racial_assumption: "Cultural Assumption",
  emotional: "Emotional Reasoning",
  strength: "Strength",
}
