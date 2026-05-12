/* eslint-disable @typescript-eslint/consistent-type-assertions */
// clerkMiddleware passes a Request that we widen to NextRequest because
// the Clerk types are not aware of Next's extensions.
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isProtectedPath } from '@/lib/routing/protected-routes'
import { isInvalidRefreshTokenError } from '@/lib/supabase/auth-helpers'
import { buildSupabaseSessionCookieOptions } from '@/lib/supabase/cookie-options'
import { getSupabaseAuthStorageKey } from '@/lib/supabase/storage-keys'

export { buildSupabaseSessionCookieOptions }

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

const PUBLIC_BYPASS_PATHS = [
  '/api/performance/metrics',
  '/api/health',
  // Clerk webhook (verified by Svix signature, must not be gated by auth).
  '/api/webhooks/clerk',
]
const SUPABASE_TIMEOUT_MS = parseInt(
  process.env.MIDDLEWARE_SUPABASE_TIMEOUT_MS || '5000',
  10
)

// Clerk route matcher for protected pages.
// Mirrors PROTECTED_PATH_PREFIXES in src/lib/routing/protected-routes.ts.
// Clerk uses path-to-regexp glob syntax.
const isClerkProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/household(.*)',
  '/settings(.*)',
  '/validation(.*)',
  '/couples(.*)',
  '/properties(.*)',
])

const hasSupabasePublicConfig = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

const getSafeRedirectPath = (value: string | null) => {
  if (!value) return null

  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return null
  }

  if (!decoded.startsWith('/')) return null
  if (decoded.startsWith('//')) return null
  if (decoded.includes('://')) return null

  return decoded
}

const applySecurityHeaders = (response: NextResponse) => {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) =>
    response.headers.set(key, value)
  )

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.supabase.co https://*.clerk.accounts.dev https://*.clerk.com https://clerk.homematch.pro https://accounts.homematch.pro https://challenges.cloudflare.com https://maps.googleapis.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://securepubads.g.doubleclick.net https://fundingchoicesmessages.google.com; " +
        "worker-src 'self' blob:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.clerk.accounts.dev https://*.clerk.com https://clerk.homematch.pro https://accounts.homematch.pro https://challenges.cloudflare.com https://maps.googleapis.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://securepubads.g.doubleclick.net https://fundingchoicesmessages.google.com; " +
        "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.homematch.pro https://accounts.homematch.pro https://challenges.cloudflare.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://securepubads.g.doubleclick.net https://fundingchoicesmessages.google.com; " +
        "frame-ancestors 'none';"
    )

    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

const createSupabaseTimeoutFetch = (signal: AbortSignal): typeof fetch => {
  return (input, init) =>
    fetch(input, {
      ...init,
      signal,
    })
}

const isSupabaseAuthTimeoutError = (error: unknown) => {
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('timeout') ||
      error.name === 'AbortError'
    )
  }

  return String(error).toLowerCase().includes('timeout')
}

/**
 * Inner middleware logic — the legacy Supabase session refresh + protection
 * pipeline. Wrapped by clerkMiddleware below.
 *
 * Why both auths coexist (Phase C transition window):
 * - Clerk gates *new* protected routes via `auth.protect()` (called above
 *   inside clerkMiddleware) but only after users sign up via Clerk's UI.
 * - Existing users still have Supabase sessions until Phase E (user data
 *   migration) ships. This Supabase path keeps them logged in.
 * - Once migration completes, this entire function can collapse to just
 *   security headers + Clerk's auth.protect().
 */
async function legacySupabaseMiddleware(
  request: NextRequest
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname
  let supabaseResponse = NextResponse.next({ request })
  const isApiRoute = pathname.startsWith('/api/')
  const isTestMode =
    process.env.NODE_ENV === 'test' ||
    process.env.NEXT_PUBLIC_TEST_MODE === 'true'
  const shouldLog =
    process.env.DEBUG_MIDDLEWARE === 'true' ||
    process.env.DEBUG_MIDDLEWARE_AUTH === 'true'

  if (PUBLIC_BYPASS_PATHS.some((path) => pathname.startsWith(path))) {
    return applySecurityHeaders(supabaseResponse)
  }

  if (isApiRoute) {
    return applySecurityHeaders(supabaseResponse)
  }

  const redirectAnonymousProtectedPage = () => {
    // Resolve against request.url (the actual incoming host) so cookies
    // stay scoped to the host the user is on (e.g. 127.0.0.1 vs localhost,
    // or www.* vs apex). Cloning request.nextUrl sometimes normalizes the
    // host and causes session loss across the redirect.
    const target = new URL('/login', request.url)
    target.searchParams.set(
      'redirectTo',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )
    return NextResponse.redirect(target)
  }

  if (!hasSupabasePublicConfig()) {
    if (isProtectedPath(pathname) && !isApiRoute) {
      return redirectAnonymousProtectedPage()
    }

    return applySecurityHeaders(supabaseResponse)
  }

  // Dynamic cookie name based on hostname
  const hostname = request.nextUrl.hostname
  const cookieName = getSupabaseAuthStorageKey(hostname)
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name === cookieName)

  if (!hasAuthCookie) {
    if (isProtectedPath(pathname)) {
      return redirectAnonymousProtectedPage()
    }

    return applySecurityHeaders(supabaseResponse)
  }

  const supabaseTimeoutController = new AbortController()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: cookieName,
        path: '/',
        sameSite: 'lax',
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: Array<{
            name: string
            value: string
            options?: Record<string, unknown>
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(
              name,
              value,
              buildSupabaseSessionCookieOptions(options)
            )
          })
        },
      },
      auth: {
        // Enable automatic token refresh
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: createSupabaseTimeoutFetch(supabaseTimeoutController.signal),
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  let user = null
  let authError = null

  try {
    // Check if the auth cookie exists to avoid unnecessary Supabase calls
    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name === cookieName)

    if (!hasAuthCookie && !isApiRoute) {
      // No auth cookie and not an API route (which might use headers)
      // We can skip getUser() safely
      user = null
    } else if (isApiRoute && isTestMode) {
      // Skip auth check for API routes in test mode
      if (shouldLog) {
        console.log(
          '[Middleware] Skipping auth check for API route in test mode:',
          request.nextUrl.pathname
        )
      }
      // user remains null, which is fine as API routes extract token from headers
    } else {
      const authTimeout = setTimeout(() => {
        supabaseTimeoutController.abort(new Error('Supabase auth timeout'))
      }, SUPABASE_TIMEOUT_MS)

      try {
        const result = await supabase.auth.getUser()
        user = result.data.user
        authError = result.error
      } finally {
        clearTimeout(authTimeout)
      }
    }

    // Handle invalid refresh token errors gracefully
    if (authError && isInvalidRefreshTokenError(authError)) {
      console.warn(
        '[Middleware] Invalid refresh token detected - treating as unauthenticated'
      )
      user = null
      authError = null
      // Clear ALL auth-related cookies to prevent repeated errors
      const allCookies = request.cookies.getAll()
      allCookies.forEach((cookie) => {
        if (
          cookie.name.startsWith('sb-') &&
          cookie.name.includes('-auth-token')
        ) {
          supabaseResponse.cookies.delete(cookie.name)
        }
      })
    }
  } catch (e) {
    // Handle thrown exceptions for invalid refresh tokens
    if (isInvalidRefreshTokenError(e)) {
      console.warn(
        '[Middleware] Invalid refresh token exception - treating as unauthenticated'
      )
      user = null
      // Clear ALL auth-related cookies
      const allCookies = request.cookies.getAll()
      allCookies.forEach((cookie) => {
        if (
          cookie.name.startsWith('sb-') &&
          cookie.name.includes('-auth-token')
        ) {
          supabaseResponse.cookies.delete(cookie.name)
        }
      })
    } else if (isSupabaseAuthTimeoutError(e)) {
      console.warn(
        '[Middleware] Supabase auth timed out - continuing as unauthenticated'
      )
      user = null
      authError = null
    } else {
      throw e
    }
  }

  if (shouldLog) {
    const cookieNames = request.cookies.getAll().map((c) => c.name)
    const hasSupabaseAuthCookie = cookieNames.some(
      (name) => name.startsWith('sb-') && name.includes('-auth-token')
    )

    console.log('[Middleware][Auth]', {
      path: request.nextUrl.pathname,
      userPresent: Boolean(user),
      authError: authError?.message ?? null,
      cookieCount: cookieNames.length,
      hasSupabaseAuthCookie,
    })
  }

  // Protected routes - redirect to login if not authenticated
  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    // Resolve against request.url so the redirect stays on the same host
    // (preserves auth cookies). See redirectAnonymousProtectedPage for
    // the same fix earlier in this file.
    const target = new URL('/login', request.url)
    target.searchParams.set(
      'redirectTo',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )
    return NextResponse.redirect(target)
  }

  // Auth routes - redirect to dashboard if already authenticated
  const authPaths = ['/login', '/signup']
  const isAuthPath = authPaths.some((path) => request.nextUrl.pathname === path)

  if (isAuthPath && user) {
    const redirectTo =
      getSafeRedirectPath(request.nextUrl.searchParams.get('redirectTo')) ||
      getSafeRedirectPath(request.nextUrl.searchParams.get('redirect'))

    if (redirectTo) {
      return NextResponse.redirect(new URL(redirectTo, request.nextUrl))
    }

    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Add security headers
  const response = applySecurityHeaders(supabaseResponse)

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return response
}

/**
 * Top-level middleware wrapping with Clerk.
 *
 * Phase C.1 (coexistence): Clerk and Supabase auth both run. Clerk handles
 * NEW sign-ups via /sign-in /sign-up; Supabase keeps existing users logged in.
 * Phase E (user data migration) is the bridge to single-source-of-truth Clerk.
 *
 * Clerk's `auth.protect()` is intentionally NOT called here yet — that would
 * lock existing Supabase users out of protected routes during the transition.
 * Instead, the legacy Supabase path still handles route protection. Once
 * Phase E completes, swap the body to:
 *
 *     if (isClerkProtectedRoute(req)) await auth.protect()
 *     return NextResponse.next()
 *
 * Behavior:
 * - If a Clerk session is detected, the user is treated as authenticated
 *   regardless of Supabase state (skip the Supabase redirect-to-login).
 * - Otherwise, fall through to the legacy Supabase pipeline.
 */
export default clerkMiddleware(async (clerkAuth, request) => {
  const nextRequest = request as NextRequest
  const pathname = nextRequest.nextUrl.pathname

  // Fast path for public-bypass routes: skip Clerk session resolution
  // entirely. /api/health benchmarked at 574ms TTFB through the full
  // middleware vs ~50ms expected for a no-DB health probe — Clerk session
  // resolution + token validation was eating most of that. Same applies
  // to /api/webhooks/clerk (Svix signature is its own auth) and the
  // performance-metrics ingest beacon.
  if (PUBLIC_BYPASS_PATHS.some((path) => pathname.startsWith(path))) {
    return applySecurityHeaders(NextResponse.next({ request: nextRequest }))
  }

  const { userId: clerkUserId } = await clerkAuth()

  // Clerk user is signed in — skip the legacy Supabase protection that would
  // redirect them to /login, and just return security headers.
  if (clerkUserId) {
    // Still let API bypass paths and API routes through with security headers.
    let response = NextResponse.next({ request: nextRequest })

    // For auth pages (login/signup) when Clerk is signed in, redirect to
    // dashboard (or the requested target).
    if (pathname === '/login' || pathname === '/signup') {
      const params = nextRequest.nextUrl.searchParams
      const redirectTo =
        getSafeRedirectPath(params.get('redirectTo')) ||
        getSafeRedirectPath(params.get('redirect'))
      const target = new URL(redirectTo ?? '/dashboard', request.url)
      response = NextResponse.redirect(target)
    }

    return applySecurityHeaders(response)
  }

  // Anonymous (no Clerk session) — fall through to the legacy Supabase
  // middleware so existing Supabase users still get their session refresh +
  // protection logic.
  return legacySupabaseMiddleware(nextRequest)
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|json|xml|txt|ico|map|woff|woff2|ttf|otf)$).*)',
  ],
}

// Export the route matcher so other layers can reuse it (sanity check that
// PROTECTED_PATH_PREFIXES and isClerkProtectedRoute stay in sync).
export { isClerkProtectedRoute }
