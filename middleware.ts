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
//   - security headers + per-request CSP nonce
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

  if (process.env.NODE_ENV === 'production') {
    // M1 (2026-05-13 audit): nonce-based CSP. Each request mints a fresh
    // nonce; Next.js attaches it to its own inline scripts (hydration,
    // RSC streaming, head metadata) when it sees the `x-nonce` request
    // header set by the wrapper below.
    //
    // Why each piece is here:
    //   - 'nonce-${nonce}'      explicit trust for Next's per-request
    //                           inline scripts
    //   - 'wasm-unsafe-eval'    Cloudflare Turnstile + WASM modules
    //   - 'unsafe-inline'       legacy-browser fallback; modern browsers
    //                           ignore it once a nonce is present
    //   - https:                external script hosts (Clerk SDK +
    //                           Account Portal, Cloudflare Turnstile,
    //                           Google Maps / AdSense)
    //
    // NOTE: 'strict-dynamic' was removed (2026-05-16). It disables host
    // allowlisting entirely, which blocked Clerk's CDN scripts
    // (clerk.browser.js / ui.browser.js from clerk.homematch.pro) — those
    // <script> tags do not carry the per-request nonce, so under
    // strict-dynamic the browser rejected them and the auth UI loaded
    // only by luck. Relying on the `https:` source keeps Clerk, Turnstile
    // and Google scripts working. Tightening this back to an explicit
    // host allowlist, or a Clerk-managed CSP via clerkMiddleware's
    // `contentSecurityPolicy` option, is possible future hardening.
    const nonce = request?.headers.get('x-nonce') ?? generateNonce()
    if (request && !request.headers.get('x-nonce')) {
      request.headers.set('x-nonce', nonce)
    }

    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
        `script-src 'nonce-${nonce}' 'wasm-unsafe-eval' 'unsafe-inline' https: blob:; ` +
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

/**
 * Cryptographically random per-request nonce, base64-encoded. 16 bytes is
 * 128 bits of entropy — well above CSP's 64-bit recommendation.
 */
const generateNonce = (): string => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
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

  // M1: mint a per-request CSP nonce up-front. We set it on the request
  // headers so Next.js (which reads `x-nonce` from incoming request
  // headers when SSR'ing) auto-applies it to its own inline scripts —
  // hydration payload, RSC streaming chunks, JSON-LD wrappers in
  // layout.tsx. applySecurityHeaders below picks up the same nonce off
  // the request to write into the CSP header.
  if (!nextRequest.headers.get('x-nonce')) {
    nextRequest.headers.set('x-nonce', generateNonce())
  }

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
