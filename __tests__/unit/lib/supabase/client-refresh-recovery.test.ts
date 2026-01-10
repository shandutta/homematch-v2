import {
  describe,
  beforeEach,
  afterEach,
  test,
  expect,
  jest,
} from '@jest/globals'
import type { AppDatabase } from '@/types/app-database'

jest.unmock('@/lib/supabase/client')

type AuthSubset = Pick<
  import('@supabase/supabase-js').SupabaseClient<AppDatabase>['auth'],
  'getSession' | 'getUser' | 'signOut'
>

type AuthMocks = {
  getSession: jest.MockedFunction<AuthSubset['getSession']>
  getUser: jest.MockedFunction<AuthSubset['getUser']>
  signOut: jest.MockedFunction<AuthSubset['signOut']>
}

const createSupabaseStub = () => {
  const auth: AuthMocks = {
    getSession: jest.fn(),
    getUser: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  }
  return { auth }
}

describe('withRefreshRecovery (browser)', () => {
  let supabase: ReturnType<typeof createSupabaseStub>
  let applyRecovery: (client: { auth: AuthSubset }) => void
  let warnSpy: jest.SpiedFunction<typeof console.warn>

  beforeEach(async () => {
    jest.clearAllMocks()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    supabase = createSupabaseStub()

    const { __withRefreshRecovery } = await import('@/lib/supabase/client')
    applyRecovery = __withRefreshRecovery
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  test('returns empty session when getSession yields invalid refresh token error', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: {
        code: 'refresh_token_not_found',
        message: 'Invalid Refresh Token',
      },
    })

    applyRecovery(supabase)

    const result = await supabase.auth.getSession()

    expect(result).toEqual({ data: { session: null }, error: null })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  test('returns empty user when getUser throws invalid refresh token error', async () => {
    supabase.auth.getUser.mockRejectedValueOnce({
      code: 'invalid_refresh_token',
      message: 'Invalid Refresh Token',
    })
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    applyRecovery(supabase)

    const result = await supabase.auth.getUser()

    expect(result).toEqual({ data: { user: null }, error: null })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })
})
