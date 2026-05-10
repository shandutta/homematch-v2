/**
 * @jest-environment node
 *
 * Tests that server.ts createClient() sets Supabase session cookies
 * with httpOnly: true via buildSupabaseSessionCookieOptions.
 *
 * Uses jest.unmock pattern matching server-refresh-recovery.test.ts.
 * Sets mockImplementation in beforeEach to survive resetMocks: true.
 */
// Phase 0/1 closure: P1-cookie-httpOnly
import {
  describe,
  beforeEach,
  afterEach,
  test,
  expect,
  jest,
} from '@jest/globals'

const mockCookieSet =
  jest.fn<
    (name: string, value: string, options: Record<string, unknown>) => void
  >()
const mockCreateServerClient = jest.fn()

jest.mock('@supabase/ssr', () => ({
  __esModule: true,
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: () => ({
    getAll: () => [],
    set: mockCookieSet,
  }),
  headers: () => ({
    get: (key: string) => {
      if (key === 'host') return 'example.com:3000'
      return null
    },
  }),
}))

// Unmock the actual server module so we test the real createClient()
jest.unmock('@/lib/supabase/server')

describe('server.ts createClient() cookie hardening', () => {
  let warnSpy: jest.SpiedFunction<typeof console.warn>

  beforeEach(() => {
    jest.clearAllMocks()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    // Re-set mock implementation after resetMocks strips it
    mockCreateServerClient.mockImplementation((_url, _key, options) => {
      // Simulate Supabase SSR calling setAll with session cookies
      options.cookies.setAll([
        {
          name: 'sb-example-auth-token',
          value: 'mock-access-token',
          options: { path: '/', sameSite: 'lax' },
        },
        {
          name: 'sb-example-auth-token-code-verifier',
          value: 'mock-verifier',
          options: {},
        },
      ])

      return {
        auth: {
          getUser: jest
            .fn()
            .mockResolvedValue({ data: { user: null }, error: null }),
          getSession: jest
            .fn()
            .mockResolvedValue({ data: { session: null }, error: null }),
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
      }
    })

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  test('sets all session cookies with httpOnly: true', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    await createClient()

    expect(mockCookieSet).toHaveBeenCalledTimes(2)

    const setCalls = mockCookieSet.mock.calls
    for (const [_name, _value, options] of setCalls) {
      expect(options.httpOnly).toBe(true)
    }
  })

  test('sets session cookies with secure: true in production', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    await createClient()

    const setCalls = mockCookieSet.mock.calls
    for (const [_name, _value, options] of setCalls) {
      expect(options.secure).toBe(true)
    }
  })

  test('each cookie includes standard fields (path, sameSite, maxAge)', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    await createClient()

    const setCalls = mockCookieSet.mock.calls
    for (const [_name, _value, options] of setCalls) {
      expect(options.path).toBe('/')
      expect(options.sameSite).toBe('lax')
      expect(options.maxAge).toBe(60 * 60 * 24 * 7)
    }
  })
})
