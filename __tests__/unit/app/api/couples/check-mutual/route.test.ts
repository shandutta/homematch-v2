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

const getUserFromRequestMock = jest.fn()
jest.mock('@/lib/api/auth', () => ({
  __esModule: true,
  getUserFromRequest: (...args: unknown[]) => getUserFromRequestMock(...args),
}))

const checkPotentialMutualLikeMock = jest.fn()
const getHouseholdStatsMock = jest.fn()
jest.mock('@/lib/services/couples', () => ({
  __esModule: true,
  CouplesService: {
    checkPotentialMutualLike: (...args: unknown[]) =>
      checkPotentialMutualLikeMock(...args),
    getHouseholdStats: (...args: unknown[]) => getHouseholdStatsMock(...args),
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

type SingleResult = { data: unknown }
type SingleChain = {
  select: jest.Mock
  eq: jest.Mock
  single: jest.Mock
}

const createSingleChain = (result: SingleResult): SingleChain => {
  const chain: SingleChain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    single: jest.fn(async () => result),
  }
  return chain
}

const createRequest = (url: string) => new NextRequest(url)

describe('couples check-mutual API route', () => {
  let route: typeof import('@/app/api/couples/check-mutual/route')

  beforeAll(async () => {
    route = await import('@/app/api/couples/check-mutual/route')
  })

  beforeEach(() => {
    jsonMock.mockClear()
    getUserFromRequestMock.mockReset()
    checkPotentialMutualLikeMock.mockReset()
    getHouseholdStatsMock.mockReset()
    createApiClientMock.mockReset()
    createApiClientMock.mockReturnValue(supabaseMock)
    supabaseMock.from.mockReset()
  })

  test('returns 401 when unauthenticated', async () => {
    getUserFromRequestMock.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await route.GET(createRequest('http://localhost/api/couples/check-mutual'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 400 when propertyId is missing', async () => {
    getUserFromRequestMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    await route.GET(createRequest('http://localhost/api/couples/check-mutual'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body.error).toBe('Property ID is required')
  })

  test('returns non-mutual response when no match found', async () => {
    getUserFromRequestMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    checkPotentialMutualLikeMock.mockResolvedValue({
      wouldBeMutual: false,
      partnerUserId: null,
    })

    await route.GET(
      createRequest(
        'http://localhost/api/couples/check-mutual?propertyId=prop-1'
      )
    )

    const [body] = jsonMock.mock.calls.at(-1)!
    expect(body.isMutual).toBe(false)
  })

  test('returns mutual details when match exists', async () => {
    getUserFromRequestMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    checkPotentialMutualLikeMock.mockResolvedValue({
      wouldBeMutual: true,
      partnerUserId: 'partner-1',
    })
    getHouseholdStatsMock.mockResolvedValue({
      activity_streak_days: 4,
      total_mutual_likes: 10,
    })

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return createSingleChain({
          data: { display_name: 'Alex', email: 'alex@example.com' },
        })
      }
      if (table === 'properties') {
        return createSingleChain({ data: { address: '123 Main St' } })
      }
      return createSingleChain({ data: null })
    })

    await route.GET(
      createRequest(
        'http://localhost/api/couples/check-mutual?propertyId=prop-1'
      )
    )

    const [body] = jsonMock.mock.calls.at(-1)!
    expect(body.isMutual).toBe(true)
    expect(body.partnerName).toBe('Alex')
    expect(body.propertyAddress).toBe('123 Main St')
    expect(body.streak).toBe(4)
    expect(body.milestone).toEqual({ type: 'mutual_likes', count: 10 })
  })

  test('returns 500 when handler throws', async () => {
    getUserFromRequestMock.mockRejectedValue(new Error('boom'))

    await route.GET(
      createRequest(
        'http://localhost/api/couples/check-mutual?propertyId=prop-1'
      )
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to check mutual like')
  })

  test('rejects unsupported methods', async () => {
    await route.POST()
    const [postBody, postInit] = jsonMock.mock.calls.at(-1)!
    expect(postInit?.status).toBe(405)
    expect(postBody.error).toBe('Method not allowed')

    await route.OPTIONS()
    const [optionsBody, optionsInit] = jsonMock.mock.calls.at(-1)!
    expect(optionsInit?.status ?? 200).toBe(200)
    expect(optionsBody).toEqual({})
  })
})
