import { describe, beforeEach, test, expect, jest } from '@jest/globals'
import type { SupabaseClient } from '@supabase/supabase-js'

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

type SupabaseStub = {
  auth: {
    getUser: jest.Mock
    getSession: jest.Mock
    signOut: jest.Mock
  }
}

describe('withRefreshRecovery', () => {
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

    applyRecovery(supabase as unknown as SupabaseClient)

    const result = await supabase.auth.getUser()

    expect(result).toEqual({ data: { user: null }, error: null })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  test('recovers when getSession throws invalid refresh token', async () => {
    supabase.auth.getSession.mockRejectedValue({
      code: 'refresh_token_not_found',
      message: 'Invalid Refresh Token',
    })

    applyRecovery(supabase as unknown as SupabaseClient)

    const result = await supabase.auth.getSession()

    expect(result).toEqual({ data: { session: null }, error: null })
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })
})
