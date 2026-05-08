import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Edge middleware — runs before every matched route.
 *
 * Responsibilities:
 *   1. Refresh the Supabase session cookie so server components see fresh auth.
 *   2. Redirect unauthenticated requests away from /admin/* to /login.
 *   3. Reject /api/admin/* mutations from cross-origin callers (CSRF).
 *
 * It deliberately does NOT check role here — that requires a DB lookup which
 * we keep at the route level. Middleware is the cheap pre-filter.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const url = request.nextUrl
  const isAdminPage = url.pathname.startsWith("/admin")
  const isAdminApi = url.pathname.startsWith("/api/admin")
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(request.method)

  // CSRF: same-origin check on admin mutations.
  if (isAdminApi && isMutation) {
    const allowed = (process.env.ADMIN_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const origin = request.headers.get("origin")
    if (!origin || !allowed.includes(origin)) {
      return new NextResponse("forbidden origin", { status: 403 })
    }
  }

  if (!isAdminPage && !isAdminApi) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options })
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (isAdminApi) {
      return new NextResponse("unauthenticated", { status: 401 })
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", url.pathname + url.search)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  // Match admin pages and admin APIs. Skip Next internals and static assets.
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
