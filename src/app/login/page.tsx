import { LoginForm } from "./login-form"

export const metadata = { title: "Sign in · Dialectica Admin" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dialectica Admin
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in with an admin account.
          </p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  )
}
