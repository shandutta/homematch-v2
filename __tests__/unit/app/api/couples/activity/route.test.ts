import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals'
import type { NextRequest } from 'next/server'

const jsonMock = jest.fn((body, init) => ({
  status: init?.status ?? 200,
  body,
}))

jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextResponse: {
      json: (...args: unknown[]) => jsonMock(...args),
    },
  }
})

const supabaseMock = {
  auth: {
    getUser: jest.fn(),
  },
}

const createApiClientMock = jest.fn(() => supabaseMock)

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: (...args: unknown[]) => createApiClientMock(...args),
}))

const getHouseholdActivityMock = jest.fn()

jest.mock('@/lib/services/couples', () => ({
  __esModule: true,
  CouplesService: {
    getHouseholdActivity: (...args: unknown[]) =>
      getHouseholdActivityMock(...args),
  },
}))

const withRateLimitMock = jest.fn((request, handler) => handler())

jest.mock('@/lib/middleware/rateLimiter', () => ({
  __esModule: true,
  withRateLimit: (request: unknown, handler: () => Promise<unknown>) =>
    withRateLimitMock(request, handler),
}))

const createRequest = (url: string) =>
  ({
    nextUrl: new URL(url),
  }) as NextRequest

describe('couples activity API route', () => {
  let route: typeof import('@/app/api/couples/activity/route')
  let setTimeoutSpy: jest.SpyInstance

  beforeAll(async () => {
    route = await import('@/app/api/couples/activity/route')
  })

  beforeEach(() => {
    jsonMock.mockClear()
    createApiClientMock.mockClear()
    supabaseMock.auth.getUser.mockReset()
    getHouseholdActivityMock.mockReset()
    withRateLimitMock.mockClear()
    setTimeoutSpy = jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(() => 0 as unknown as NodeJS.Timeout)
  })

  afterEach(() => {
    setTimeoutSpy.mockRestore()
  })

  test('returns method not allowed for unsupported methods', async () => {
    const postResponse = await route.POST()
    const putResponse = await route.PUT()
    const deleteResponse = await route.DELETE()
    const patchResponse = await route.PATCH()

    expect(postResponse.status).toBe(405)
    expect(putResponse.status).toBe(405)
    expect(deleteResponse.status).toBe(405)
    expect(patchResponse.status).toBe(405)
  })

  test('OPTIONS responds with ok', async () => {
    await route.OPTIONS()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(200)
    expect(body.status).toBe('ok')
  })

  test('GET returns 401 when unauthenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await route.GET(createRequest('https://example.com/api/couples/activity'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
    expect(getHouseholdActivityMock).not.toHaveBeenCalled()
  })

  test('GET clamps limit and offset before fetching', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    getHouseholdActivityMock.mockResolvedValue([{ id: 'activity-1' }])

    await route.GET(
      createRequest(
        'https://example.com/api/couples/activity?limit=200&offset=-5'
      )
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.activity).toEqual([{ id: 'activity-1' }])
    expect(body.performance.count).toBe(1)
    expect(getHouseholdActivityMock).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      100,
      0
    )
  })

  test('GET returns 500 when service throws', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    getHouseholdActivityMock.mockRejectedValue(new Error('boom'))

    await route.GET(createRequest('https://example.com/api/couples/activity'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to fetch household activity')
  })
})
