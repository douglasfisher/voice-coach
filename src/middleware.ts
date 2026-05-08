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
 *
 * Cookie-forwarding pattern follows the official Supabase SSR guide: when
 * Supabase refreshes tokens, setAll updates `request.cookies` AND rebuilds
 * the response with `NextResponse.next({ request })` so the refreshed cookies
 * propagate to the downstream Server Components in the same request.
 * Without this, RSCs read stale cookies, trigger another refresh against an
 * already-used refresh token, and the user appears to be logged out.
 */
export async function middleware(request: NextRequest) {
  const reqUrl = request.nextUrl
  const isAdminPage = reqUrl.pathname.startsWith("/admin")
  const isAdminApi = reqUrl.pathname.startsWith("/api/admin")
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

  let response = NextResponse.next({ request })

  if (!isAdminPage && !isAdminApi) return response

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    return new NextResponse(
      "Admin app is misconfigured: NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set in .env.local. " +
        "Copy .env.example to .env.local and fill in the values.",
      { status: 500 }
    )
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // CRITICAL: do not run any code between createServerClient and getUser —
  // the Supabase docs warn that this can desynchronise the session refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (isAdminApi) {
      return new NextResponse("unauthenticated", { status: 401 })
    }
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", reqUrl.pathname + reqUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  // Match admin pages and admin APIs. Skip Next internals and static assets.
  matcher: ["/admin/:path*", "/api/admin/:path*"],
}
