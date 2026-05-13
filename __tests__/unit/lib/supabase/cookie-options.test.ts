// Phase 0/1 closure: P1-cookie-httpOnly
import { buildSupabaseSessionCookieOptions } from '@/lib/supabase/cookie-options'

describe('buildSupabaseSessionCookieOptions', () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
  })

  it('forces httpOnly: true regardless of input', () => {
    const result = buildSupabaseSessionCookieOptions({ httpOnly: false })
    expect(result.httpOnly).toBe(true)
  })

  it('forces httpOnly: true when no input options provided', () => {
    const result = buildSupabaseSessionCookieOptions()
    expect(result.httpOnly).toBe(true)
  })

  it('overrides httpOnly even when input explicitly sets false', () => {
    const result = buildSupabaseSessionCookieOptions({
      httpOnly: false,
      path: '/custom',
    })
    expect(result.httpOnly).toBe(true)
    expect(result.path).toBe('/custom')
  })

  // M2 (2026-05-13 audit): cookie Secure defaults true regardless of
  // NODE_ENV. Vercel preview deploys, ngrok tunnels, prod-mode local
  // builds, and any HTTPS-fronted env all need Secure cookies; the
  // prior NODE_ENV check left them unset there.
  it('sets secure: true by default (regardless of NODE_ENV)', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' }
    expect(buildSupabaseSessionCookieOptions().secure).toBe(true)
  })

  it('keeps secure: true in development by default', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' }
    expect(buildSupabaseSessionCookieOptions().secure).toBe(true)
  })

  it('opts out only when HOMEMATCH_INSECURE_COOKIES=1', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      HOMEMATCH_INSECURE_COOKIES: '1',
    }
    expect(buildSupabaseSessionCookieOptions().secure).toBe(false)
  })

  it('preserves caller-provided path and sameSite', () => {
    const result = buildSupabaseSessionCookieOptions({
      path: '/api',
      sameSite: 'strict',
    })
    expect(result.path).toBe('/api')
    expect(result.sameSite).toBe('strict')
  })

  it('defaults path to / and sameSite to lax', () => {
    const result = buildSupabaseSessionCookieOptions({})
    expect(result.path).toBe('/')
    expect(result.sameSite).toBe('lax')
  })

  it('defaults maxAge to 7 days (604800 seconds)', () => {
    const result = buildSupabaseSessionCookieOptions()
    expect(result.maxAge).toBe(60 * 60 * 24 * 7)
  })

  it('uses provided maxAge when specified', () => {
    const result = buildSupabaseSessionCookieOptions({ maxAge: 3600 })
    expect(result.maxAge).toBe(3600)
  })
})
