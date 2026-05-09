/**
 * Tiny template renderer used by the AI prompt routes.
 *
 * Supports two placeholder forms:
 *   {{var}}                              — required value
 *   {{var|or 'fallback'}}                — substitutes the literal fallback
 *                                          if `var` is missing or empty
 *
 * Mirrors mobile's `formData.name || 'Unknown'` patterns so the rendered
 * output matches mobile byte-for-byte. The fallback delimiter is a single
 * quote — kept simple because the templates we ship don't need anything
 * fancier. Unknown vars render as empty string (not the literal `{{var}}`)
 * so half-typed templates fail gracefully.
 */

const FALLBACK_RE =
  /\{\{\s*([a-z_][a-z0-9_]*)\s*\|\s*or\s*'([^']*)'\s*\}\}/gi
const PLAIN_RE = /\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi

export function renderTemplate(
  tpl: string,
  vars: Record<string, string | number | null | undefined>
): string {
  const get = (key: string): string => {
    const v = vars[key]
    if (v === undefined || v === null) return ""
    return String(v)
  }
  return tpl
    .replace(FALLBACK_RE, (_m, key: string, fb: string) => {
      const v = get(key).trim()
      return v.length > 0 ? v : fb
    })
    .replace(PLAIN_RE, (_m, key: string) => get(key))
}
