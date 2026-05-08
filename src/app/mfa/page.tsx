import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function MfaPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Two-factor authentication required
        </h1>
        <p className="text-muted-foreground text-sm">
          Admin sessions must be verified with a TOTP code. The MFA challenge
          flow is not yet wired up in this scaffold — finish enrolment in the
          Supabase dashboard, then complete the AAL2 challenge here.
        </p>
        <Button variant="secondary" render={<Link href="/login" />}>
          Back to sign in
        </Button>
      </div>
    </main>
  )
}
