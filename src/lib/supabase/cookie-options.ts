type SupabaseCookieOptions = {
  maxAge?: number
  path?: string
  sameSite?: 'lax' | 'strict' | 'none' | boolean
  secure?: boolean
  httpOnly?: boolean
  [key: string]: unknown
}

/**
 * M2 (2026-05-13 audit): cookie `secure` should reflect the request's
 * scheme, not just NODE_ENV. Vercel preview deploys, ngrok tunnels,
 * production-mode local builds, and any HTTPS-fronted dev/staging all
 * need Secure cookies; the prior NODE_ENV check left them unset there.
 *
 * We default true (HTTPS everywhere is the assumed deployment shape) and
 * let the caller opt out only for explicitly-insecure local development.
 */
const isSecureContext = (): boolean => {
  // Explicit override for local dev that genuinely runs over plain HTTP.
  if (process.env.HOMEMATCH_INSECURE_COOKIES === '1') return false
  // Otherwise: default true. Production, preview, staging, anything
  // proxied over HTTPS — all get Secure cookies.
  return true
}

export const buildSupabaseSessionCookieOptions = (
  options: SupabaseCookieOptions = {}
) => ({
  ...options,
  maxAge: options.maxAge ?? 60 * 60 * 24 * 7,
  path: options.path ?? '/',
  sameSite: options.sameSite ?? 'lax',
  secure: options.secure ?? isSecureContext(),
  httpOnly: true,
})
