import { describe, beforeEach, test, expect, jest } from '@jest/globals'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'

jest.unmock('@/lib/supabase/server')

const createServerClientMock = jest.fn()

jest.mock('@supabase/ssr', () => ({
  __esModule: true,
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}))

jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: () => ({
    getAll: () => [],
    set: jest.fn(),
  }),
  headers: () => ({
    get: () => null,
  }),
}))

const createSupabaseStub = (): SupabaseClient<AppDatabase> => {
  const client = createClient<AppDatabase>(
    'http://localhost:54321',
    'test-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async () =>
          new Response(JSON.stringify({ data: null, error: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      },
    }
  )

  const auth = client.auth
  auth.getUser = jest.fn<
    ReturnType<typeof auth.getUser>,
    Parameters<typeof auth.getUser>
  >()
  auth.getSession = jest.fn<
    ReturnType<typeof auth.getSession>,
    Parameters<typeof auth.getSession>
  >()
  auth.signOut = jest
    .fn<ReturnType<typeof auth.signOut>, Parameters<typeof auth.signOut>>()
    .mockResolvedValue({ error: null })

  return client
}

describe('withRefreshRecovery', () => {
  let supabase: SupabaseClient<AppDatabase>
  let applyRecovery: (client: SupabaseClient) => void
  let warnSpy: jest.SpiedFunction<typeof console.warn>

  beforeEach(async () => {
    jest.clearAllMocks()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    supabase = createSupabaseStub()

    const { __withRefreshRecovery } = await import('@/lib/supabase/server')
    applyRecovery = __withRefreshRecovery
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  test('clears invalid refresh token errors returned from getUser', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: {
        code: 'refresh_token_not_found',
        message: 'Invalid Refresh Token: Refresh Token Not Found',
      },
    })

    applyRecovery(supabase)

    const result = await supabase.auth.getUser()

    expect(result).toEqual({ data: { user: null }, error: null })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  test('recovers when getSession throws invalid refresh token', async () => {
    supabase.auth.getSession.mockRejectedValue({
      code: 'refresh_token_not_found',
      message: 'Invalid Refresh Token',
    })

    applyRecovery(supabase)

    const result = await supabase.auth.getSession()

    expect(result).toEqual({ data: { session: null }, error: null })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })
})
