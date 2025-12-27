import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals'
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

const serviceClientMock = {
  from: jest.fn(),
}
const getServiceRoleClientMock = jest.fn(async () => serviceClientMock)

jest.mock('@/lib/supabase/service-role-client', () => ({
  __esModule: true,
  getServiceRoleClient: () => getServiceRoleClientMock(),
}))

const rateLimiterCheckMock = jest.fn()

jest.mock('@/lib/utils/rate-limit', () => ({
  __esModule: true,
  apiRateLimiter: {
    check: (...args: unknown[]) => rateLimiterCheckMock(...args),
  },
}))

const createRequest = (query: string) =>
  ({
    nextUrl: new URL(`https://example.com/api/users/search${query}`),
  }) as NextRequest

const createChainMock = (result: { data: any; error: any }) => {
  const chain: any = {
    select: jest.fn(() => chain),
    neq: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    ilike: jest.fn(() => chain),
    limit: jest.fn(async () => result),
  }

  return chain
}

describe('users search API route', () => {
  let route: typeof import('@/app/api/users/search/route')

  beforeAll(async () => {
    route = await import('@/app/api/users/search/route')
  })

  beforeEach(() => {
    jsonMock.mockClear()
    createApiClientMock.mockClear()
    supabaseMock.auth.getUser.mockReset()
    serviceClientMock.from.mockReset()
    getServiceRoleClientMock.mockClear()
    rateLimiterCheckMock.mockReset()
    rateLimiterCheckMock.mockResolvedValue({ success: true })
  })

  test('returns 401 when unauthenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await route.GET(createRequest('?q=alex'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 429 when rate limited', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    rateLimiterCheckMock.mockResolvedValue({ success: false })

    await route.GET(createRequest('?q=alex'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(429)
    expect(body.error).toBe('Too many requests. Please try again later.')
  })

  test('returns 400 when query is too short', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    await route.GET(createRequest('?q=ab'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body.error).toBe('Search query must be at least 3 characters')
  })

  test('returns 500 when search fails', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    serviceClientMock.from.mockReturnValue(
      createChainMock({ data: null, error: { message: 'db down' } })
    )

    await route.GET(createRequest('?q=alex'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to search users')
  })

  test('returns sanitized users on success', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    serviceClientMock.from.mockReturnValue(
      createChainMock({
        data: [
          {
            id: 'user-2',
            email: 'user2@example.com',
            display_name: 'User Two',
            household_id: 'house-1',
          },
        ],
        error: null,
      })
    )

    await route.GET(createRequest('?q=use'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.users).toEqual([
      {
        id: 'user-2',
        email: 'user2@example.com',
        display_name: 'User Two',
        avatar_url: null,
        household_id: 'house-1',
      },
    ])
  })
})
