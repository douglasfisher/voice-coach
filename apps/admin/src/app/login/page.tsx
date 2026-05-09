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
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-lg text-base font-semibold">
            D
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Dialectica Admin
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in with an admin account.
            </p>
          </div>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  )
}
