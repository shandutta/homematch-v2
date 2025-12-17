import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isInvalidRefreshTokenError } from '@/lib/supabase/auth-helpers'
import { getSupabaseAuthStorageKey } from '@/lib/supabase/storage-keys'

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
}

const PUBLIC_BYPASS_PATHS = ['/api/performance/metrics', '/api/health']
const SUPABASE_TIMEOUT_MS = parseInt(
  process.env.MIDDLEWARE_SUPABASE_TIMEOUT_MS || '5000',
  10
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
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://maps.googleapis.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://securepubads.g.doubleclick.net https://fundingchoicesmessages.google.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "img-src 'self' data: https: blob:; " +
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://securepubads.g.doubleclick.net https://fundingchoicesmessages.google.com; " +
        "frame-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://securepubads.g.doubleclick.net https://fundingchoicesmessages.google.com; " +
        "frame-ancestors 'none';"
    )

    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  let timeoutId: NodeJS.Timeout
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Supabase auth timeout')),
          timeoutMs
        )
      }),
    ])
  } finally {
    clearTimeout(timeoutId!)
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  let supabaseResponse = NextResponse.next({ request })

  if (PUBLIC_BYPASS_PATHS.some((path) => pathname.startsWith(path))) {
    return applySecurityHeaders(supabaseResponse)
  }

  // Dynamic cookie name based on hostname
  const hostname = request.nextUrl.hostname
  const cookieName = getSupabaseAuthStorageKey(hostname)

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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Force secure based on environment, ignoring the incoming option which might be wrong
            const isProduction = process.env.NODE_ENV === 'production'
            const sharedOptions = {
              ...options,
              maxAge: options?.maxAge ?? 60 * 60 * 24 * 7,
              path: options?.path ?? '/',
              sameSite: options?.sameSite ?? 'lax',
              secure: isProduction,
            }

            // Log cookie setting for debugging
            // console.log(`[Middleware] Setting cookie: ${name}, Secure: ${sharedOptions.secure}`)

            supabaseResponse.cookies.set(name, value, {
              ...sharedOptions,
              httpOnly: false, // Allow client-side to read cookie for session hydration
            })
          })
        },
      },
      auth: {
        // Enable automatic token refresh
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  let user = null
  let authError = null

  try {
    // Optimization for integration tests: API routes handle their own auth via headers.
    // Skipping middleware auth check for /api/ routes in test mode significantly speeds up tests.
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
    const isTestMode =
      process.env.NODE_ENV === 'test' ||
      process.env.NEXT_PUBLIC_TEST_MODE === 'true'

    if (isApiRoute && isTestMode) {
      // Skip auth check for API routes in test mode
      console.log(
        '[Middleware] Skipping auth check for API route in test mode:',
        request.nextUrl.pathname
      )
      // user remains null, which is fine as API routes extract token from headers
    } else {
      const result = await withTimeout(
        supabase.auth.getUser(),
        SUPABASE_TIMEOUT_MS
      )
      user = result.data.user
      authError = result.error
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
    const message = e instanceof Error ? e.message : String(e)

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
    } else if (message.toLowerCase().includes('timeout')) {
      console.warn(
        '[Middleware] Supabase auth timed out - continuing as unauthenticated'
      )
      user = null
      authError = null
    } else {
      throw e
    }
  }

  const shouldLog =
    process.env.DEBUG_MIDDLEWARE === 'true' ||
    process.env.DEBUG_MIDDLEWARE_AUTH === 'true'

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
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/households',
    '/helloworld_notes',
    '/validation',
    '/couples',
  ]
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set(
      'redirectTo',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )
    return NextResponse.redirect(url)
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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
