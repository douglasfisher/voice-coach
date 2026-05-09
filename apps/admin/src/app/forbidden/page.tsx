import Link from "next/link"
import { Button } from "@/components/ui/button"
import { signOutAction } from "@/app/login/actions"

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Access denied</h1>
        <p className="text-muted-foreground text-sm">
          This account does not have permission to view the admin console.
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="secondary" render={<Link href="/login" />}>
            Back to sign in
          </Button>
          <form action={signOutAction}>
            <Button type="submit">Sign out</Button>
          </form>
        </div>
      </div>
    </main>
  )
}
