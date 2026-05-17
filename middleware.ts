/* eslint-disable @typescript-eslint/consistent-type-assertions */
// clerkMiddleware passes a Request that we widen to NextRequest because
// the Clerk types are not aware of Next's extensions.
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'
import {
  isProtectedPath,
  PROTECTED_PATH_PREFIXES,
} from '@/lib/routing/protected-routes'

// Phase 3 (Supabase-auth elimination, 2026-05-13): the legacy
// Supabase session-refresh middleware path has been removed. Clerk is
// the sole identity provider, so anonymous users no longer need a
// per-host cookie read, a Supabase server-client per request, or a
// refresh-token recovery branch. What remains:
//
//   - security headers + Content-Security-Policy
//   - Clerk session resolution (with a timeout fallback)
//   - protected-path → /login redirect for anonymous traffic
//   - /login + /signup → dashboard redirect for already-signed-in users
//
// The `/login` page itself still exists; Phase 4 of the migration
// deletes it (and the cookie-options / storage-keys helpers that fed
// the old refresh-recovery path).

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

// Content-Security-Policy (CSP rework, 2026-05-17).
//
// History: this directive previously used `'strict-dynamic'` with a
// per-request nonce. That is fundamentally incompatible with this app's
// statically-prerendered pages — Clerk's (and Next's) <script> tags cannot
// receive a per-request nonce at build time, so the browser blocked
// clerk.browser.js under strict-dynamic and the auth UI broke. Using a
// nonce would force every page to dynamic rendering.
//
// So `script-src` uses an explicit host allowlist (Clerk's own documented
// baseline). `'unsafe-inline'` covers Next's inline hydration/RSC scripts
// (no nonce to gate them); `'wasm-unsafe-eval'` is for Cloudflare
// Turnstile's WASM module. There is deliberately NO blanket `https:` — an
// attacker who finds an HTML-injection point cannot load remote code from
// an arbitrary origin, only from the listed Clerk / Turnstile / Google /
// Vercel hosts.
const SCRIPT_SRC_HOSTS = [
  // Clerk SDK + Account Portal
  'https://*.clerk.accounts.dev',
  'https://*.clerk.com',
  'https://clerk.homematch.pro',
  'https://accounts.homematch.pro',
  // Cloudflare Turnstile (Clerk bot protection)
  'https://challenges.cloudflare.com',
  // Google Maps JS API
  'https://maps.googleapis.com',
  // Google AdSense (loads transitively across these Google domains)
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://*.google.com',
  'https://*.gstatic.com',
  // Vercel Speed Insights
  'https://va.vercel-scripts.com',
].join(' ')

const CONNECT_SRC_HOSTS = [
  'https://*.supabase.co',
  'wss://*.supabase.co',
  'https://*.clerk.accounts.dev',
  'https://*.clerk.com',
  'https://clerk.homematch.pro',
  'https://accounts.homematch.pro',
  // Clerk SDK telemetry beacon
  'https://clerk-telemetry.com',
  'https://*.clerk-telemetry.com',
  'https://challenges.cloudflare.com',
  'https://maps.googleapis.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://fundingchoicesmessages.google.com',
  'https://*.adtrafficquality.google',
  'https://*.google.com',
  'https://vitals.vercel-insights.com',
].join(' ')

const FRAME_SRC_HOSTS = [
  'https://*.clerk.accounts.dev',
  'https://*.clerk.com',
  'https://clerk.homematch.pro',
  'https://accounts.homematch.pro',
  'https://challenges.cloudflare.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://fundingchoicesmessages.google.com',
].join(' ')

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${SCRIPT_SRC_HOSTS} blob:`,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  `connect-src 'self' ${CONNECT_SRC_HOSTS}`,
  `frame-src 'self' ${FRAME_SRC_HOSTS}`,
  "frame-ancestors 'none'",
].join('; ')

// Clerk route matcher for protected pages.
// M5 (2026-05-13 audit): derived from the single PROTECTED_PATH_PREFIXES
// source so a new route is added in one place. The trailing `(.*)` makes
// it path-prefix matching to mirror `isProtectedPath`'s `startsWith` form.
const isClerkProtectedRoute = createRouteMatcher(
  PROTECTED_PATH_PREFIXES.map((prefix) => `${prefix}(.*)`)
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

const applySecurityHeaders = (
  response: NextResponse,
  request?: NextRequest
) => {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) =>
    response.headers.set(key, value)
  )

  // A6 (2026-05-13 audit): emit a request ID for log correlation. If the
  // edge (Vercel, Cloudflare) already attached one, preserve it; otherwise
  // mint a fresh UUID. Available to handlers via the request headers
  // (read with request.headers.get('x-request-id')) and surfaced to the
  // client on the response so issues can be reported back with the ID.
  const incomingId =
    request?.headers.get('x-request-id') ||
    request?.headers.get('x-vercel-id') ||
    null
  const requestId = incomingId ?? crypto.randomUUID()
  response.headers.set('x-request-id', requestId)
  if (request && !request.headers.get('x-request-id')) {
    request.headers.set('x-request-id', requestId)
  }

  // CSP + HSTS in production only — keeps `next dev` (React Refresh, eval)
  // unrestricted.
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY)
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

const redirectToLogin = (request: NextRequest): NextResponse => {
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

/**
 * Top-level middleware wrapped with Clerk.
 *
 * Phase 3 (Supabase-auth elimination, 2026-05-13): Clerk is the only
 * identity source — the legacy Supabase session-refresh branch is gone.
 *
 * Flow:
 * - Public-bypass paths skip Clerk session resolution entirely.
 * - Clerk session is resolved with a timeout fallback (failure → anon).
 * - Signed-in users on /login or /signup get redirected to /dashboard
 *   (or a sanitized ?redirectTo target).
 * - Anonymous users hitting protected pages redirect to /login.
 * - API routes always pass through with security headers; route handlers
 *   re-verify the Clerk session themselves.
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
    return applySecurityHeaders(
      NextResponse.next({ request: nextRequest }),
      nextRequest
    )
  }

  // M3 (2026-05-13 audit): wrap clerkAuth() in a timeout. Without it,
  // Clerk SDK slowness (token verification, JWKS fetch, network blip)
  // hangs every request through middleware. Default 5s; override via
  // env for tighter SLAs.
  const clerkTimeoutMs = parseInt(
    process.env.MIDDLEWARE_CLERK_TIMEOUT_MS || '5000',
    10
  )
  let clerkUserId: string | null = null
  try {
    const clerkResult = await Promise.race([
      clerkAuth(),
      new Promise<{ userId: null }>((_, reject) =>
        setTimeout(
          () => reject(new Error('Clerk auth timeout')),
          clerkTimeoutMs
        )
      ),
    ])
    clerkUserId = clerkResult.userId ?? null
  } catch (err) {
    console.warn(
      '[Middleware] Clerk auth failed/timed out — treating as unauthenticated:',
      err instanceof Error ? err.message : err
    )
    clerkUserId = null
  }

  if (clerkUserId) {
    // Signed-in: redirect away from /login + /signup, otherwise pass through.
    let response = NextResponse.next({ request: nextRequest })

    if (pathname === '/login' || pathname === '/signup') {
      const params = nextRequest.nextUrl.searchParams
      const redirectTo =
        getSafeRedirectPath(params.get('redirectTo')) ||
        getSafeRedirectPath(params.get('redirect'))
      const target = new URL(redirectTo ?? '/dashboard', request.url)
      response = NextResponse.redirect(target)
    }

    return applySecurityHeaders(response, nextRequest)
  }

  // Anonymous from here on.
  //
  // API routes always pass through — every API handler re-verifies the
  // Clerk session via requireUserFromRequest, and many public endpoints
  // (search, properties feed) are intentionally anon-readable.
  if (pathname.startsWith('/api/')) {
    return applySecurityHeaders(
      NextResponse.next({ request: nextRequest }),
      nextRequest
    )
  }

  // Anonymous + protected page → /login.
  if (isProtectedPath(pathname)) {
    return redirectToLogin(nextRequest)
  }

  return applySecurityHeaders(
    NextResponse.next({ request: nextRequest }),
    nextRequest
  )
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
