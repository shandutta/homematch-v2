type SupabaseCookieOptions = {
  maxAge?: number
  path?: string
  sameSite?: 'lax' | 'strict' | 'none' | boolean
  secure?: boolean
  httpOnly?: boolean
  [key: string]: unknown
}

export const buildSupabaseSessionCookieOptions = (
  options: SupabaseCookieOptions = {}
) => ({
  ...options,
  maxAge: options.maxAge ?? 60 * 60 * 24 * 7,
  path: options.path ?? '/',
  sameSite: options.sameSite ?? 'lax',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
})
