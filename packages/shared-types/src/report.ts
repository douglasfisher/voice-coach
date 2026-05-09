/**
 * Session report payload — generated at session end by the chat edge
 * function (task_type='report') and stored on conversations.analysis_summary.
 *
 * Mobile renders it on the post-session report screen
 * (app/(tabs)/chat/report/[id].tsx). Admin mirrors it in the
 * Conversation > Analysis tab so the admin sees what the user saw.
 */

export interface SessionReport {
  /** One-line summary shown at the top of the report. */
  tldr: string
  /** Bullet list of things the user did well. */
  strengths: string[]
  /** Bullet list of areas to improve. */
  weaknesses: string[]
  /** Long-form paragraph analysis (rendered behind a "View detailed
   * analysis" disclosure on mobile). */
  detailed_analysis: string
  /** 0–100. Mobile color-codes by tier (≥75 emerald / ≥50 amber / <50 red). */
  overall_score: number
  /** ISO timestamp the report was generated. */
  generated_at: string
}

/**
 * Aggregate timing metrics computed over a conversation, stored on
 * conversations.timing_metrics. Used by the SessionStats card.
 *
 * Field naming notes:
 *  - `assistant_avg_response_ms` is the legacy field; `ai_avg_response_ms`
 *    was added later for clarity. Both populate the same metric depending
 *    on which version of the chat fn wrote the row. Consumers should
 *    prefer `ai_avg_response_ms` and fall back to `assistant_avg_response_ms`.
 */
export interface TimingMetrics {
  total_duration_ms: number
  exchange_count: number
  word_count_total?: number
  // User metrics
  user_word_count?: number
  user_avg_response_ms: number
  user_avg_words_per_response?: number
  // AI metrics — see naming note above
  ai_word_count?: number
  ai_avg_response_ms?: number
  assistant_avg_response_ms?: number
}
