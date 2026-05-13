/**
 * Negative-path guards for the Supabase session cookie policy.
 *
 * The positive policy lives in src/lib/supabase/cookie-options.ts:
 *   - httpOnly is forced true (browser JS must never read session cookies).
 *   - secure defaults true (M2 audit fix, 2026-05-13). The previous policy
 *     bound Secure to NODE_ENV === 'production', which left preview deploys
 *     and HTTPS-fronted dev/staging without Secure cookies. The new default
 *     opts in to Secure everywhere; HOMEMATCH_INSECURE_COOKIES=1 is the
 *     explicit escape hatch for plain-HTTP local dev.
 *   - sameSite defaults to 'lax' (caller may tighten to 'strict').
 *
 * These tests exist to ensure no caller can weaken the policy by passing
 * conflicting options through the spread.
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
      expect(
        buildSupabaseSessionCookieOptions({ httpOnly: false }).httpOnly
      ).toBe(true)
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

  describe('secure default is true and cannot be overridden by caller', () => {
    it('caller cannot disable Secure in production', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' }
      expect(buildSupabaseSessionCookieOptions({ secure: false }).secure).toBe(
        true
      )
    })

    it('caller cannot disable Secure in development either (M2 audit fix)', () => {
      process.env = { ...originalEnv, NODE_ENV: 'development' }
      expect(buildSupabaseSessionCookieOptions({ secure: false }).secure).toBe(
        true
      )
    })

    it('NODE_ENV=test still gets Secure on by default (M2 audit fix)', () => {
      process.env = { ...originalEnv, NODE_ENV: 'test' }
      expect(buildSupabaseSessionCookieOptions().secure).toBe(true)
    })

    it('unset NODE_ENV still gets Secure on by default (M2 audit fix)', () => {
      const env = { ...originalEnv }
      delete env.NODE_ENV
      process.env = env
      expect(buildSupabaseSessionCookieOptions().secure).toBe(true)
    })

    it('HOMEMATCH_INSECURE_COOKIES=1 is the only escape hatch (plain-HTTP local dev)', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        HOMEMATCH_INSECURE_COOKIES: '1',
      }
      expect(buildSupabaseSessionCookieOptions().secure).toBe(false)
    })

    it('HOMEMATCH_INSECURE_COOKIES=1 overrides caller attempts to force Secure too', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        HOMEMATCH_INSECURE_COOKIES: '1',
      }
      expect(buildSupabaseSessionCookieOptions({ secure: true }).secure).toBe(
        false
      )
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
