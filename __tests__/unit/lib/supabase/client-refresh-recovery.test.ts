import {
  describe,
  beforeEach,
  afterEach,
  test,
  expect,
  jest,
} from '@jest/globals'
import type { SupabaseClient } from '@supabase/supabase-js'

jest.unmock('@/lib/supabase/client')

type SupabaseStub = {
  auth: {
    getUser: jest.Mock
    getSession: jest.Mock
    signOut: jest.Mock
  }
}

describe('withRefreshRecovery (browser)', () => {
  let supabase: SupabaseStub
  let applyRecovery: (client: SupabaseClient) => void
  let warnSpy: jest.SpyInstance

  beforeEach(async () => {
    jest.clearAllMocks()
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    supabase = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
        signOut: jest.fn().mockResolvedValue({}),
      },
    }

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

    applyRecovery(supabase as unknown as SupabaseClient)

    const result = await supabase.auth.getSession()

    expect(result).toEqual({ data: { session: null }, error: null })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  test('returns empty user when getUser throws invalid refresh token error', async () => {
    supabase.auth.getUser.mockRejectedValue({
      code: 'invalid_refresh_token',
      message: 'Invalid Refresh Token',
    })

    applyRecovery(supabase as unknown as SupabaseClient)

    const result = await supabase.auth.getUser()

    expect(result).toEqual({ data: { user: null }, error: null })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })
})
