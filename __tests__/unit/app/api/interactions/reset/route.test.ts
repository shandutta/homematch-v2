import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  jest,
} from '@jest/globals'
import { NextRequest } from 'next/server'

const jsonMock = jest.fn((body, init) => ({
  status: init?.status ?? 200,
  body,
}))

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (...args: unknown[]) => jsonMock(...args),
  },
  NextRequest:
    jest.requireActual<typeof import('next/server')>('next/server').NextRequest,
}))

const mockCheckRateLimit = jest.fn()
jest.mock('@/lib/middleware/rateLimiter', () => ({
  __esModule: true,
  checkRateLimit: mockCheckRateLimit,
  rateLimitKey: (scope: string, identifier: string) => `${scope}:${identifier}`,
}))

const clearHouseholdCacheMock = jest.fn()
jest.mock('@/lib/services/couples', () => ({
  __esModule: true,
  CouplesService: {
    clearHouseholdCache: (...args: unknown[]) =>
      clearHouseholdCacheMock(...args),
  },
}))

const createApiClientMock = jest.fn()
const mockRequireUserFromRequest = jest.fn()
const getServiceRoleClientMock = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: (...args: unknown[]) => createApiClientMock(...args),
}))

jest.mock('@/lib/supabase/service-role-client', () => ({
  __esModule: true,
  getServiceRoleClient: (...args: unknown[]) =>
    getServiceRoleClientMock(...args),
}))

jest.mock('@/lib/api/auth', () => ({
  __esModule: true,
  requireUserFromRequest: (...args: unknown[]) =>
    mockRequireUserFromRequest(...args),
}))

type SupabaseMock = {
  auth: {
    getUser: jest.Mock
  }
  from: jest.Mock
  rpc: jest.Mock
}

const supabaseMock: SupabaseMock = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  rpc: jest.fn(),
}

const writeClientMock: SupabaseMock = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  rpc: jest.fn(),
}

type RpcResult = { data: unknown; error: unknown }

describe('interactions reset API route', () => {
  let route: typeof import('@/app/api/interactions/reset/route')

  beforeAll(async () => {
    route = await import('@/app/api/interactions/reset/route')
  })

  beforeEach(() => {
    jsonMock.mockReset()
    jsonMock.mockImplementation((body, init) => ({
      status: init?.status ?? 200,
      body,
    }))
    mockCheckRateLimit.mockReset()
    mockRequireUserFromRequest.mockReset()
    clearHouseholdCacheMock.mockReset()
    createApiClientMock.mockReset()
    createApiClientMock.mockReturnValue(supabaseMock)
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockReset()
    supabaseMock.rpc.mockReset()
    getServiceRoleClientMock.mockReset()
    getServiceRoleClientMock.mockResolvedValue(writeClientMock)
    writeClientMock.from.mockReset()
    writeClientMock.rpc.mockReset()
  })

  test('returns 401 when unauthenticated', async () => {
    mockRequireUserFromRequest.mockResolvedValue({
      user: null,
      response: jsonMock(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      ),
    })

    await route.DELETE(
      new NextRequest('http://localhost/api/interactions/reset', {
        method: 'DELETE',
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.code).toBe('UNAUTHORIZED')
  })

  test('returns 429 when rate limit is exceeded', async () => {
    mockRequireUserFromRequest.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    })
    mockCheckRateLimit.mockResolvedValue(
      jsonMock(
        {
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMITED',
        },
        { status: 429 }
      )
    )

    await route.DELETE(
      new NextRequest('http://localhost/api/interactions/reset', {
        method: 'DELETE',
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(429)
    expect(body.error).toBe('Rate limit exceeded. Please try again later.')
  })

  test('returns 500 when rpc returns an error', async () => {
    mockRequireUserFromRequest.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    })
    mockCheckRateLimit.mockResolvedValue(null)

    const errorResult: RpcResult = { data: null, error: { message: 'db error' } }
    writeClientMock.rpc.mockResolvedValue(errorResult)

    await route.DELETE(
      new NextRequest('http://localhost/api/interactions/reset', {
        method: 'DELETE',
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to reset interactions')
  })

  test('returns 500 when rpc throws or times out', async () => {
    mockRequireUserFromRequest.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    })
    mockCheckRateLimit.mockResolvedValue(null)

    writeClientMock.rpc.mockReturnValue(Promise.reject(new Error('boom')))

    await route.DELETE(
      new NextRequest('http://localhost/api/interactions/reset', {
        method: 'DELETE',
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to reset interactions (timeout)')
  })

  test('clears household cache and returns success', async () => {
    mockRequireUserFromRequest.mockResolvedValue({
      user: { id: 'user-1' },
      response: null,
    })
    mockCheckRateLimit.mockResolvedValue(null)

    const successResult: RpcResult = {
      data: [
        { deleted_household_id: 'house-1' },
        { deleted_household_id: 'house-1' },
        { deleted_household_id: 'house-2' },
      ],
      error: null,
    }
    writeClientMock.rpc.mockResolvedValue(successResult)

    await route.DELETE(
      new NextRequest('http://localhost/api/interactions/reset', {
        method: 'DELETE',
      })
    )

    expect(writeClientMock.rpc).toHaveBeenCalledWith(
      'reset_user_interactions_for_user_id',
      { p_user_id: 'user-1' }
    )
    expect(clearHouseholdCacheMock).toHaveBeenCalledWith('house-1')
    expect(clearHouseholdCacheMock).toHaveBeenCalledWith('house-2')

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.data).toEqual({ deleted: true, count: 3 })
  })
})
