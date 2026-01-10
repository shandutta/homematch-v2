import { describe, beforeEach, test, expect, jest } from '@jest/globals'
import type { AppDatabase } from '@/types/app-database'

jest.unmock('@/lib/supabase/server')

type AuthSubset = Pick<
  import('@supabase/supabase-js').SupabaseClient<AppDatabase>['auth'],
  'getSession' | 'getUser' | 'signOut'
>

type AuthMocks = {
  getSession: jest.MockedFunction<AuthSubset['getSession']>
  getUser: jest.MockedFunction<AuthSubset['getUser']>
  signOut: jest.MockedFunction<AuthSubset['signOut']>
}

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

const createSupabaseStub = () => {
  const auth: AuthMocks = {
    getSession: jest.fn(),
    getUser: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  }
  return { auth }
}

describe('withRefreshRecovery', () => {
  let supabase: ReturnType<typeof createSupabaseStub>
  let applyRecovery: (client: { auth: AuthSubset }) => void
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
    supabase.auth.getUser
      .mockResolvedValueOnce({
        data: { user: null },
        error: {
          code: 'refresh_token_not_found',
          message: 'Invalid Refresh Token: Refresh Token Not Found',
        },
      })
      .mockResolvedValueOnce({ data: { user: null }, error: null })

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
