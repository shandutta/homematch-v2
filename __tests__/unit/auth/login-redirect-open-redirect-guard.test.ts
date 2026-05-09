/**
 * @jest-environment node
 *
 * Auth redirect regression guard.
 *
 * The /login and /signup routes accept a `redirectTo` (and legacy `redirect`)
 * query param so that deep links survive a login round-trip. The middleware's
 * `getSafeRedirectPath` helper sanitizes those values: anything that is not a
 * same-origin absolute path must fall through to /dashboard.
 *
 * The E2E coverage for this lives in __tests__/e2e/auth-redirects.spec.ts but
 * requires a live Supabase auth session. This unit guard exercises the same
 * decision at the middleware layer with a mocked Supabase auth client so the
 * regression cannot ship even when the E2E gate is skipped.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest } from 'next/server'
import { middleware } from '../../../middleware'

const mockGetUser = jest.fn()
const createServerClientMock = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}))

const AUTH_COOKIE_NAME = 'sb-localhost-example-supabase-co-anon-key-auth-token'

const installAuthenticatedSupabaseMock = () => {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  })

  createServerClientMock.mockImplementation(() => ({
    auth: { getUser: mockGetUser },
  }))
}

const makeAuthedLoginRequest = (search: string) =>
  new NextRequest(new URL(`/login${search}`, 'http://localhost:3000'), {
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=mock-session`,
    },
  })

const makeAuthedSignupRequest = (search: string) =>
  new NextRequest(new URL(`/signup${search}`, 'http://localhost:3000'), {
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=mock-session`,
    },
  })

describe('auth redirect open-redirect guard (authenticated /login & /signup)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NODE_ENV: 'production',
    }
    createServerClientMock.mockReset()
    mockGetUser.mockReset()
    installAuthenticatedSupabaseMock()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it.each([
    ['absolute external URL', '?redirectTo=https://evil.example.com/take-over'],
    ['protocol-relative host', '?redirectTo=//evil.example.com'],
    [
      'URL-encoded protocol-relative host',
      '?redirectTo=%2F%2Fevil.example.com',
    ],
    ['javascript scheme', '?redirectTo=javascript:alert(1)'],
    ['data scheme', '?redirectTo=data:text/html,<script>1</script>'],
    ['mailto scheme', '?redirectTo=mailto:phish@example.com'],
    [
      'scheme-relative w/ encoded colon',
      '?redirectTo=https%3A%2F%2Fevil.example.com',
    ],
    [
      'malformed percent-encoded path that decodeURIComponent rejects',
      '?redirectTo=%E0%A4%A',
    ],
    ['empty redirectTo', '?redirectTo='],
    [
      'legacy redirect param pointing to external host',
      '?redirect=https://evil.example.com',
    ],
    [
      'legacy redirect param pointing to protocol-relative host',
      '?redirect=//evil.example.com',
    ],
  ])(
    'falls back to same-origin /dashboard when redirectTo is %s',
    async (_label, search) => {
      const response = await middleware(makeAuthedLoginRequest(search))

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).not.toBeNull()
      const parsed = new URL(location ?? '')
      // Critical: the redirect Location header must point at the local origin,
      // never at an attacker-controlled host or scheme.
      expect(parsed.origin).toBe('http://localhost:3000')
      expect(parsed.protocol).toBe('http:')
      expect(parsed.pathname).toBe('/dashboard')
      expect(parsed.host).toBe('localhost:3000')
      expect(parsed.host).not.toContain('evil.example.com')
    }
  )

  it.each([
    ['/dashboard', '?redirectTo=%2Fdashboard'],
    ['/dashboard/liked', '?redirectTo=%2Fdashboard%2Fliked'],
    ['/dashboard?tab=liked', '?redirectTo=%2Fdashboard%3Ftab%3Dliked'],
    ['/couples', '?redirectTo=%2Fcouples'],
    ['/properties/abc123', '?redirectTo=%2Fproperties%2Fabc123'],
  ])(
    'preserves same-origin redirectTo %s for authenticated users hitting /login',
    async (expectedPath, search) => {
      const response = await middleware(makeAuthedLoginRequest(search))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe(
        `http://localhost:3000${expectedPath}`
      )
    }
  )

  it('honors legacy redirect= param when redirectTo is absent', async () => {
    const response = await middleware(
      makeAuthedLoginRequest('?redirect=%2Fcouples%2Fdecisions')
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/couples/decisions'
    )
  })

  it('prefers redirectTo over legacy redirect when both are supplied', async () => {
    const response = await middleware(
      makeAuthedLoginRequest(
        '?redirectTo=%2Fdashboard%2Fliked&redirect=%2Fcouples'
      )
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/dashboard/liked'
    )
  })

  it('falls back to same-origin /dashboard when redirectTo is unsafe and legacy redirect is also unsafe', async () => {
    const response = await middleware(
      makeAuthedLoginRequest(
        '?redirectTo=https%3A%2F%2Fevil.example.com&redirect=%2F%2Fevil.example.com'
      )
    )

    expect(response.status).toBe(307)
    const parsed = new URL(response.headers.get('location') ?? '')
    expect(parsed.origin).toBe('http://localhost:3000')
    expect(parsed.pathname).toBe('/dashboard')
  })

  it('applies the same sanitizer when authenticated users hit /signup', async () => {
    const externalResponse = await middleware(
      makeAuthedSignupRequest('?redirectTo=https://evil.example.com')
    )
    expect(externalResponse.status).toBe(307)
    const externalParsed = new URL(
      externalResponse.headers.get('location') ?? ''
    )
    expect(externalParsed.origin).toBe('http://localhost:3000')
    expect(externalParsed.pathname).toBe('/dashboard')

    const internalResponse = await middleware(
      makeAuthedSignupRequest('?redirectTo=%2Fcouples')
    )
    expect(internalResponse.status).toBe(307)
    expect(internalResponse.headers.get('location')).toBe(
      'http://localhost:3000/couples'
    )
  })
})

describe('auth redirect sanitizer source guard', () => {
  const middlewareSource = readFileSync(
    join(process.cwd(), 'middleware.ts'),
    'utf8'
  )

  it('rejects protocol-relative paths, scheme URIs, and decode failures before redirecting', () => {
    // Path-prefix gate: only values starting with `/` survive.
    expect(middlewareSource).toMatch(
      /if\s*\(\s*!decoded\.startsWith\('\/'\)\s*\)\s*return\s+null/
    )
    // Protocol-relative gate.
    expect(middlewareSource).toMatch(
      /if\s*\(\s*decoded\.startsWith\('\/\/'\)\s*\)\s*return\s+null/
    )
    // Scheme-embedded gate (catches javascript:, data:, https://, etc.).
    expect(middlewareSource).toMatch(
      /if\s*\(\s*decoded\.includes\('::\/\/'?\)|if\s*\(\s*decoded\.includes\(':\/\/'\)\s*\)\s*return\s+null/
    )
    // decodeURIComponent failures must be treated as untrusted.
    expect(middlewareSource).toContain('decodeURIComponent(value)')
    expect(middlewareSource).toMatch(/}\s*catch\s*{\s*return\s+null/)
  })

  it('reads the sanitizer for both redirectTo and the legacy redirect param', () => {
    expect(middlewareSource).toContain(
      "getSafeRedirectPath(request.nextUrl.searchParams.get('redirectTo'))"
    )
    expect(middlewareSource).toContain(
      "getSafeRedirectPath(request.nextUrl.searchParams.get('redirect'))"
    )
  })
})
