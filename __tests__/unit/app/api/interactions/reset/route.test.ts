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

const checkMock = jest.fn()
jest.mock('@/lib/utils/rate-limit', () => ({
  apiRateLimiter: {
    check: (...args: unknown[]) => checkMock(...args),
  },
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

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: (...args: unknown[]) => createApiClientMock(...args),
}))

type SupabaseMock = {
  auth: {
    getUser: jest.Mock
  }
  from: jest.Mock
}

const supabaseMock: SupabaseMock = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}

type DeleteResult = { data: unknown; error: unknown }
type DeleteChain = {
  delete: jest.Mock
  eq: jest.Mock
  select: jest.Mock
}

const createDeleteChain = (result: DeleteResult): DeleteChain => {
  const chain: DeleteChain = {
    delete: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    select: jest.fn(async () => result),
  }
  return chain
}

describe('interactions reset API route', () => {
  let route: typeof import('@/app/api/interactions/reset/route')

  beforeAll(async () => {
    route = await import('@/app/api/interactions/reset/route')
  })

  beforeEach(() => {
    jsonMock.mockClear()
    checkMock.mockReset()
    clearHouseholdCacheMock.mockReset()
    createApiClientMock.mockReset()
    createApiClientMock.mockReturnValue(supabaseMock)
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockReset()
  })

  test('returns 401 when unauthenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
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

  test('returns 400 when rate limit is exceeded', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    checkMock.mockResolvedValue({ success: false })

    await route.DELETE(
      new NextRequest('http://localhost/api/interactions/reset', {
        method: 'DELETE',
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body.error).toBe('Too many requests. Please try again later.')
  })

  test('returns 500 when delete returns an error', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    checkMock.mockResolvedValue({ success: true })

    const chain = createDeleteChain({
      data: null,
      error: { message: 'db error' },
    })
    supabaseMock.from.mockReturnValue(chain)

    await route.DELETE(
      new NextRequest('http://localhost/api/interactions/reset', {
        method: 'DELETE',
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to reset interactions')
  })

  test('returns 500 when delete throws or times out', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    checkMock.mockResolvedValue({ success: true })

    const chain = createDeleteChain({ data: null, error: null })
    chain.select = jest.fn(() => Promise.reject(new Error('boom')))
    supabaseMock.from.mockReturnValue(chain)

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
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    checkMock.mockResolvedValue({ success: true })

    const chain = createDeleteChain({
      data: [
        { id: '1', household_id: 'house-1' },
        { id: '2', household_id: 'house-1' },
        { id: '3', household_id: 'house-2' },
      ],
      error: null,
    })
    supabaseMock.from.mockReturnValue(chain)

    await route.DELETE(
      new NextRequest('http://localhost/api/interactions/reset', {
        method: 'DELETE',
      })
    )

    expect(supabaseMock.from).toHaveBeenCalledWith('user_property_interactions')
    expect(clearHouseholdCacheMock).toHaveBeenCalledWith('house-1')
    expect(clearHouseholdCacheMock).toHaveBeenCalledWith('house-2')

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.data).toEqual({ deleted: true, count: 3 })
  })
})
