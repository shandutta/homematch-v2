import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
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

const createApiClientMock = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: (...args: unknown[]) => createApiClientMock(...args),
}))

jest.mock('@/lib/utils/rate-limit', () => ({
  __esModule: true,
  apiRateLimiter: {
    check: jest.fn(async () => ({ success: true })),
  },
}))

jest.mock('@/lib/services/couples', () => ({
  __esModule: true,
  CouplesService: {
    clearHouseholdCache: jest.fn(),
  },
}))

jest.mock('@/lib/supabase/service-role-client', () => ({
  __esModule: true,
  getServiceRoleClient: jest.fn(),
}))

type SupabaseMock = {
  auth: {
    getUser: jest.Mock
  }
  rpc: jest.Mock
}

const supabaseMock: SupabaseMock = {
  auth: {
    getUser: jest.fn(),
  },
  rpc: jest.fn(),
}

const createRequest = (url: string, init?: RequestInit) =>
  new NextRequest(url, init)

describe('interactions API auth boundary', () => {
  let route: typeof import('@/app/api/interactions/route')

  beforeAll(async () => {
    route = await import('@/app/api/interactions/route')
  })

  beforeEach(() => {
    jsonMock.mockClear()
    createApiClientMock.mockReset()
    createApiClientMock.mockReturnValue(supabaseMock)
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.rpc.mockReset()
  })

  test('POST returns 401 when user is missing', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await route.POST(
      createRequest('http://localhost/api/interactions', {
        method: 'POST',
        body: JSON.stringify({ propertyId: 'p1', type: 'like' }),
        headers: {
          'content-type': 'application/json',
        },
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('GET returns the standard 401 response when unauthenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await route.GET(
      createRequest('http://localhost/api/interactions?type=summary')
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('GET summary returns 500 when RPC fails', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    })

    await route.GET(
      createRequest('https://example.com/api/interactions?type=summary')
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to fetch summary')
  })

  test('GET retries stale bearer auth against request session context', async () => {
    supabaseMock.auth.getUser
      .mockResolvedValueOnce({ data: { user: null }, error: null })
      .mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null })

    await route.GET(
      createRequest('http://localhost/api/interactions', {
        headers: { authorization: 'Bearer stale-token' },
      })
    )

    expect(supabaseMock.auth.getUser).toHaveBeenNthCalledWith(1, 'stale-token')
    expect(supabaseMock.auth.getUser).toHaveBeenNthCalledWith(2)
    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body.error).toBe('Missing type query parameter')
  })

  test('DELETE uses the shared auth helper before parsing the body', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await route.DELETE(
      createRequest('http://localhost/api/interactions', {
        method: 'DELETE',
        body: JSON.stringify({ propertyId: 'prop-1' }),
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })
})
