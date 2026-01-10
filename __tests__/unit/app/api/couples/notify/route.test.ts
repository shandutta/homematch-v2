import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  jest,
} from '@jest/globals'
import { NextRequest } from 'next/server'

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

const notifyInteractionMock = jest.fn()
const checkPotentialMutualLikeMock = jest.fn()

jest.mock('@/lib/services/couples', () => ({
  __esModule: true,
  CouplesService: {
    notifyInteraction: (...args: unknown[]) => notifyInteractionMock(...args),
    checkPotentialMutualLike: (...args: unknown[]) =>
      checkPotentialMutualLikeMock(...args),
  },
}))

type ChainResult = { data: unknown; error: unknown }
type Chain = {
  select: jest.Mock
  eq: jest.Mock
  single: jest.Mock
}

const createChainMock = (result: ChainResult): Chain => {
  const chain: Chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    single: jest.fn(async () => result),
  }

  return chain
}

const createRequest = (body: Record<string, unknown>) =>
  new NextRequest('https://example.com/api/couples/notify', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
    },
  })

describe('couples notify API route', () => {
  let route: typeof import('@/app/api/couples/notify/route')

  beforeAll(async () => {
    route = await import('@/app/api/couples/notify/route')
  })

  beforeEach(() => {
    jsonMock.mockClear()
    createApiClientMock.mockReset()
    createApiClientMock.mockReturnValue(supabaseMock)
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockReset()
    notifyInteractionMock.mockReset()
    checkPotentialMutualLikeMock.mockReset()
  })

  test('returns 401 when unauthenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await route.POST(createRequest({}))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 400 for invalid request payload', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    await route.POST(
      createRequest({
        propertyId: 'not-a-uuid',
        interactionType: 'like',
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body.error).toBe('Invalid request data')
    expect(body.details).toBeDefined()
  })

  test('returns mutual like details when notification should be sent', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          user_metadata: { display_name: 'Test User' },
        },
      },
      error: null,
    })

    notifyInteractionMock.mockResolvedValue(undefined)
    checkPotentialMutualLikeMock.mockResolvedValue({
      wouldBeMutual: true,
      partnerUserId: 'partner-1',
    })

    supabaseMock.from.mockReturnValue(
      createChainMock({
        data: { address: '123 Main St', price: 100000, images: [] },
        error: null,
      })
    )

    await route.POST(
      createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'like',
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.success).toBe(true)
    expect(body.mutual_like_created).toBe(true)
    expect(body.notification_sent).toBe(true)
    expect(body.partner_user_id).toBe('partner-1')
    expect(notifyInteractionMock).toHaveBeenCalledWith(
      supabaseMock,
      'user-1',
      '550e8400-e29b-41d4-a716-446655440000',
      'like'
    )
  })

  test('returns success without notification when not mutual', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    notifyInteractionMock.mockResolvedValue(undefined)
    checkPotentialMutualLikeMock.mockResolvedValue({
      wouldBeMutual: false,
      partnerUserId: null,
    })

    await route.POST(
      createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'skip',
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.success).toBe(true)
    expect(body.mutual_like_created).toBe(false)
    expect(body.notification_sent).toBe(false)
  })

  test('returns 500 when service throws', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    notifyInteractionMock.mockRejectedValue(new Error('boom'))

    await route.POST(
      createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'like',
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to process notification')
  })
})
