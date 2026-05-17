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
const requireUserFromRequestMock = jest.fn()
const getServiceRoleClientMock = jest.fn()
const checkRateLimitMock = jest.fn()

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
    requireUserFromRequestMock(...args),
}))

jest.mock('@/lib/auth/ensure-profile', () => ({
  __esModule: true,
  ensureUserProfileForCurrentClerkUser: jest.fn(),
}))

jest.mock('@/lib/middleware/rateLimiter', () => ({
  __esModule: true,
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  rateLimitKey: (scope: string, identifier: string) => `${scope}:${identifier}`,
}))

jest.mock('@/lib/services/couples', () => ({
  __esModule: true,
  CouplesService: { clearHouseholdCache: jest.fn() },
}))

const apiClientMock = {
  auth: { getUser: jest.fn() },
  rpc: jest.fn(),
  from: jest.fn(),
}

const serviceRoleMock = {
  rpc: jest.fn(),
  from: jest.fn(),
}

const makeListChain = (data: unknown, error: unknown = null) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(resolve({ data, error })),
  }
  return chain
}

describe('interactions GET API route service-role reads', () => {
  let route: typeof import('@/app/api/interactions/route')

  beforeAll(async () => {
    route = await import('@/app/api/interactions/route')
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jsonMock.mockImplementation((body, init) => ({
      status: init?.status ?? 200,
      body,
    }))
    createApiClientMock.mockReturnValue(apiClientMock)
    requireUserFromRequestMock.mockResolvedValue({
      user: { id: '00000000-0000-0000-0000-000000000001' },
      response: null,
    })
    checkRateLimitMock.mockResolvedValue(null)
    getServiceRoleClientMock.mockResolvedValue(serviceRoleMock)
  })

  test('summary uses the service-role client so persisted Clerk interactions are visible', async () => {
    serviceRoleMock.rpc.mockResolvedValue({
      data: [{ interaction_type: 'like', count: 1 }],
      error: null,
    })

    await route.GET(
      new NextRequest('http://localhost/api/interactions?type=summary')
    )

    expect(serviceRoleMock.rpc).toHaveBeenCalledWith(
      'get_user_interaction_summary',
      { p_user_id: '00000000-0000-0000-0000-000000000001' }
    )
    expect(apiClientMock.rpc).not.toHaveBeenCalled()
    const [body] = jsonMock.mock.calls.at(-1)!
    expect(body).toEqual({ liked: 1, passed: 0, viewed: 0 })
  })

  test('interaction lists use service-role reads instead of the RLS-blocked anon client', async () => {
    serviceRoleMock.from.mockReturnValue(
      makeListChain([
        {
          created_at: '2026-05-17T00:00:00.000Z',
          property: {
            id: '00000000-0000-0000-0000-000000000002',
            address: '123 Main St',
            city: 'Lafayette',
            state: 'CA',
            zip_code: '94549',
            price: 1000000,
            bedrooms: 3,
            bathrooms: 2,
            square_feet: 1800,
            property_type: 'single_family',
            images: [],
            description: null,
            coordinates: null,
            neighborhood_id: null,
            amenities: [],
            year_built: null,
            lot_size_sqft: null,
            parking_spots: null,
            listing_status: 'active',
            property_hash: null,
            is_active: true,
            created_at: '2026-05-17T00:00:00.000Z',
            updated_at: '2026-05-17T00:00:00.000Z',
          },
        },
      ])
    )

    await route.GET(
      new NextRequest('http://localhost/api/interactions?type=liked&limit=12')
    )

    expect(serviceRoleMock.from).toHaveBeenCalledWith(
      'user_property_interactions'
    )
    expect(apiClientMock.from).not.toHaveBeenCalledWith(
      'user_property_interactions'
    )
    const [body] = jsonMock.mock.calls.at(-1)!
    expect(body.items).toHaveLength(1)
  })
})
