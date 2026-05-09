/**
 * Negative-path guards for the Supabase session cookie policy.
 *
 * The positive policy lives in src/lib/supabase/cookie-options.ts:
 *   - httpOnly is forced true (browser JS must never read session cookies).
 *   - secure is bound to NODE_ENV === 'production'.
 *   - sameSite defaults to 'lax' (caller may tighten to 'strict').
 *
 * These tests exist to ensure no caller can weaken the policy by passing
 * conflicting options through the spread, and to pin the dev-only exception
 * (Secure attribute is intentionally off when NODE_ENV is not 'production',
 * including 'test' and 'development' — required so local HTTP dev sessions
 * work without TLS).
 */
// Phase 0/1 closure: P1-cookie-httpOnly
import { buildSupabaseSessionCookieOptions } from '@/lib/supabase/cookie-options'

describe('Supabase session cookie policy — negative guards', () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
  })

  describe('httpOnly cannot be downgraded by caller', () => {
    it('rejects httpOnly: false (boolean)', () => {
      expect(buildSupabaseSessionCookieOptions({ httpOnly: false }).httpOnly).toBe(true)
    })

    it('rejects httpOnly: undefined as a noop (still true)', () => {
      expect(
        buildSupabaseSessionCookieOptions({ httpOnly: undefined }).httpOnly
      ).toBe(true)
    })

    it('does not let unknown passthrough keys shadow httpOnly', () => {
      const result = buildSupabaseSessionCookieOptions({
        httpOnly: false,
        // Extra keys are preserved (passthrough) but must never be a vector
        // for relaxing the httpOnly invariant.
        domain: 'cross.example.com',
        priority: 'low',
      })
      expect(result.httpOnly).toBe(true)
      expect(result.domain).toBe('cross.example.com')
    })
  })

  describe('secure is bound to NODE_ENV and cannot be overridden', () => {
    it('caller cannot disable Secure in production', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' }
      expect(
        buildSupabaseSessionCookieOptions({ secure: false }).secure
      ).toBe(true)
    })

    it('caller cannot fake Secure in development (dev-only exception)', () => {
      process.env = { ...originalEnv, NODE_ENV: 'development' }
      expect(
        buildSupabaseSessionCookieOptions({ secure: true }).secure
      ).toBe(false)
    })

    it('NODE_ENV=test is treated as non-production (Secure off in unit tests)', () => {
      process.env = { ...originalEnv, NODE_ENV: 'test' }
      expect(buildSupabaseSessionCookieOptions().secure).toBe(false)
    })

    it('unset NODE_ENV is treated as non-production', () => {
      const env = { ...originalEnv }
      delete env.NODE_ENV
      process.env = env
      expect(buildSupabaseSessionCookieOptions().secure).toBe(false)
    })
  })

  describe('sameSite defaults are safe and only tightened by caller', () => {
    it('defaults sameSite to lax when caller omits it', () => {
      expect(buildSupabaseSessionCookieOptions().sameSite).toBe('lax')
    })

    it('preserves caller-tightened sameSite: strict', () => {
      expect(
        buildSupabaseSessionCookieOptions({ sameSite: 'strict' }).sameSite
      ).toBe('strict')
    })

    it("preserves caller-relaxed sameSite: 'none' (cross-site flows still get httpOnly + Secure-in-prod)", () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' }
      const result = buildSupabaseSessionCookieOptions({ sameSite: 'none' })
      // sameSite=none must always be paired with httpOnly+secure; the policy
      // still enforces both regardless of the caller's request.
      expect(result.sameSite).toBe('none')
      expect(result.httpOnly).toBe(true)
      expect(result.secure).toBe(true)
    })
  })

  describe('caller-supplied non-policy fields do not bypass security envelope', () => {
    it('a short maxAge still ships httpOnly + secure-in-prod', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' }
      const result = buildSupabaseSessionCookieOptions({ maxAge: 1 })
      expect(result.maxAge).toBe(1)
      expect(result.httpOnly).toBe(true)
      expect(result.secure).toBe(true)
    })

    it('a custom path scope still ships httpOnly + secure-in-prod', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' }
      const result = buildSupabaseSessionCookieOptions({ path: '/auth' })
      expect(result.path).toBe('/auth')
      expect(result.httpOnly).toBe(true)
      expect(result.secure).toBe(true)
    })
  })
})
