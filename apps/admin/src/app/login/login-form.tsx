import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Login form. Submits as a regular POST to /api/login (a route handler)
 * so browsers and password managers (Chrome, Safari, 1Password,
 * Bitwarden, etc.) reliably trigger their "save password?" prompts.
 *
 * React Server Actions submit via fetch, which leaves password managers
 * unsure whether the form actually completed — many of them silently
 * skip the save prompt for action-based forms. A regular POST + 303
 * redirect is the well-trodden pattern that every PM recognises.
 *
 * Notable attributes:
 * - method="post"                — explicit so PMs don't have to infer.
 * - action="/api/login"          — real URL navigation; not RSC.
 * - autoComplete="on" on form    — opts into PM autofill.
 * - autoComplete="username"      — preferred over "email" by some PMs
 *                                  even when type="email".
 * - autoComplete="current-password" — the canonical hint for the PW field.
 *
 * Server-side validation + redirect-with-?error= keeps this a fully
 * server-component page; no client state needed for the happy path or
 * the error display.
 */
export function LoginForm({
  next,
  error,
}: {
  next?: string
  error?: string
}) {
  return (
    <form
      method="post"
      action="/api/login"
      autoComplete="on"
      className="space-y-4"
      id="login-form"
      name="login"
    >
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? (
        <p
          className="text-destructive text-sm"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full">
        Sign in
      </Button>
    </form>
  )
}
