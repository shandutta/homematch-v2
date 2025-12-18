import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/couples/disputed/route'

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

const createChainMock = (result: any) => {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    upsert: jest.fn(() => chain),
    single: jest.fn(async () => result),
    maybeSingle: jest.fn(async () => result),
    then: jest.fn((resolve) => resolve(result)),
  }

  return chain
}

const supabaseMock: any = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
}

const serviceClientMock: any = {
  from: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: () => supabaseMock,
}))

jest.mock('@/lib/supabase/service-role-client', () => ({
  __esModule: true,
  getServiceRoleClient: async () => serviceClientMock,
}))

const resetSupabase = () => {
  supabaseMock.auth.getUser.mockReset()
  supabaseMock.from.mockReset()
  serviceClientMock.from.mockReset()
}

describe('couples disputed API route', () => {
  beforeEach(() => {
    jsonMock.mockClear()
    resetSupabase()
  })

  test('GET returns 401 when user is not authenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const req = new NextRequest('https://example.com/api/couples/disputed')
    await GET(req)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('GET returns 404 when user has no household', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    supabaseMock.from.mockReturnValueOnce(
      createChainMock({
        data: { household_id: null, display_name: 'User 1', email: 'u1@test' },
        error: null,
      })
    )

    const req = new NextRequest('https://example.com/api/couples/disputed')
    await GET(req)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(404)
    expect(body.error).toBe('No household found')
  })

  test('GET returns empty results when household has one member', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    supabaseMock.from.mockReturnValueOnce(
      createChainMock({
        data: {
          household_id: 'household-1',
          display_name: 'User 1',
          email: 'u1@test',
        },
        error: null,
      })
    )

    serviceClientMock.from.mockReturnValueOnce(
      createChainMock({
        data: [{ id: 'user-1', display_name: 'User 1', email: 'u1@test' }],
        error: null,
      })
    )

    const req = new NextRequest('https://example.com/api/couples/disputed')
    await GET(req)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.disputedProperties).toEqual([])
    expect(body.performance).toHaveProperty('totalTime')
  })

  test('GET returns disputed properties when interactions conflict', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const interactions = [
      {
        user_id: 'user-1',
        property_id: 'property-1',
        interaction_type: 'like',
        created_at: '2024-01-02T00:00:00.000Z',
        score_data: { notes: 'Love it' },
        properties: {
          address: '123 Main St',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1680,
          images: ['/test.jpg'],
          listing_status: 'active',
        },
      },
      {
        user_id: 'user-2',
        property_id: 'property-1',
        interaction_type: 'dislike',
        created_at: '2024-01-01T00:00:00.000Z',
        score_data: { notes: 'Not for me' },
        properties: {
          address: '123 Main St',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1680,
          images: ['/test.jpg'],
          listing_status: 'active',
        },
      },
    ]

    supabaseMock.from.mockReturnValueOnce(
      createChainMock({
        data: {
          household_id: 'household-1',
          display_name: 'User 1',
          email: 'u1@test',
        },
        error: null,
      })
    )

    serviceClientMock.from
      .mockReturnValueOnce(
        createChainMock({
          data: [
            { id: 'user-1', display_name: 'User 1', email: 'u1@test' },
            { id: 'user-2', display_name: 'User 2', email: 'u2@test' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(createChainMock({ data: [], error: null }))
      .mockReturnValueOnce(createChainMock({ data: interactions, error: null }))

    const req = new NextRequest('https://example.com/api/couples/disputed')
    await GET(req)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.performance.count).toBe(1)
    expect(body.disputedProperties).toHaveLength(1)

    const disputed = body.disputedProperties[0]
    expect(disputed.property_id).toBe('property-1')
    expect(disputed.status).toBe('pending')
    expect(disputed.property.address).toBe('123 Main St')
    expect(disputed.partner1.user_id).toBe('user-1')
    expect(disputed.partner1.interaction_type).toBe('like')
    expect(disputed.partner1.notes).toBe('Love it')
    expect(disputed.partner2.user_id).toBe('user-2')
    expect(disputed.partner2.interaction_type).toBe('dislike')
    expect(disputed.partner2.notes).toBe('Not for me')
  })

  test('PATCH returns 401 when user is not authenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const req = {
      json: async () => ({}),
    } as unknown as NextRequest

    await PATCH(req)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('PATCH returns 400 when property_id or resolution_type is missing', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const req = {
      json: async () => ({ property_id: 'property-1' }),
    } as unknown as NextRequest

    await PATCH(req)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body.error).toBe('Property ID and resolution type are required')
  })

  test('PATCH returns success payload', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    supabaseMock.from.mockReturnValueOnce(
      createChainMock({
        data: { household_id: 'household-1' },
        error: null,
      })
    )

    serviceClientMock.from.mockReturnValueOnce(
      createChainMock({
        error: null,
      })
    )

    const req = {
      json: async () => ({
        property_id: 'property-1',
        resolution_type: 'saved_for_later',
      }),
    } as unknown as NextRequest

    await PATCH(req)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.success).toBe(true)
    expect(body.property_id).toBe('property-1')
    expect(body.resolution_type).toBe('saved_for_later')
    expect(typeof body.timestamp).toBe('string')
  })
})
