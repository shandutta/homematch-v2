import { describe, beforeEach, test, expect, jest } from '@jest/globals'
import type { SupabaseClient } from '@supabase/supabase-js'
import { __withRefreshRecovery } from '@/lib/supabase/server'

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

type SupabaseStub = {
  auth: {
    getUser: jest.Mock
    getSession: jest.Mock
    signOut: jest.Mock
  }
}

describe('withRefreshRecovery', () => {
  let supabase: SupabaseStub

  beforeEach(() => {
    jest.clearAllMocks()
    supabase = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
        signOut: jest.fn().mockResolvedValue({}),
      },
    }
  })

  test('clears invalid refresh token errors returned from getUser', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: {
        code: 'refresh_token_not_found',
        message: 'Invalid Refresh Token: Refresh Token Not Found',
      },
    })

    __withRefreshRecovery(supabase as unknown as SupabaseClient)

    const result = await supabase.auth.getUser()

    expect(result).toEqual({ data: { user: null }, error: null })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  test('recovers when getSession throws invalid refresh token', async () => {
    supabase.auth.getSession.mockRejectedValue({
      code: 'refresh_token_not_found',
      message: 'Invalid Refresh Token',
    })

    __withRefreshRecovery(supabase as unknown as SupabaseClient)

    const result = await supabase.auth.getSession()

    expect(result).toEqual({ data: { session: null }, error: null })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })
})
