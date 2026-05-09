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

// Mock auth
const getUserFromRequestMock = jest.fn()
jest.mock('@/lib/api/auth', () => ({
  __esModule: true,
  getUserFromRequest: (...args: unknown[]) => getUserFromRequestMock(...args),
  requireUserFromRequest: async (...args: unknown[]) => {
    const result = await getUserFromRequestMock(...args)
    const user = result?.user ?? result?.data?.user ?? null
    return user
      ? { user, response: null }
      : { user: null, response: jsonMock({ error: 'Unauthorized' }, { status: 401 }) }
  },
}))

// Mock cache-control
const noStoreJsonMock = jest.fn((data) => data)
jest.mock('@/lib/api/cache-control', () => ({
  __esModule: true,
  noStoreJson: (...args: unknown[]) => noStoreJsonMock(...args),
}))

// Mock supabase server
const createApiClientMock = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: (...args: unknown[]) => createApiClientMock(...args),
}))

// Build a Supabase chain mock
type ChainResult = {
  data: unknown
  error: { message: string } | null
}

const createChain = (result: ChainResult) => {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  }
  return chain
}

const MOCK_USER = { id: 'test-user-1', email: 'test@example.com' }
const MOCK_PROPERTY_ID = 'property-123'
const MOCK_HOUSEHOLD_ID = 'household-abc'

describe('Property Reactions API - GET /api/couples/property-reactions', () => {
  let GET: (request: NextRequest) => Promise<unknown>
  let supabaseMock: Record<string, jest.Mock>

  beforeAll(async () => {
    const mod = await import(
      '@/app/api/couples/property-reactions/route'
    )
    GET = mod.GET
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Default: authenticated user with a household
    getUserFromRequestMock.mockResolvedValue({
      user: MOCK_USER,
      data: { user: MOCK_USER },
    })

    createApiClientMock.mockReturnValue({
      from: jest.fn(),
    })

    supabaseMock = {
      from: jest.fn(),
    }
    createApiClientMock.mockReturnValue(supabaseMock)
  })

  describe('Authentication', () => {
    test('returns 401 when user is not authenticated', async () => {
      getUserFromRequestMock.mockResolvedValue({
        user: null,
        data: { user: null },
      })

      const url = new URL(
        `http://localhost/api/couples/property-reactions?propertyId=${MOCK_PROPERTY_ID}`
      )
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(jsonMock).toHaveBeenCalled()
    })
  })

  describe('Validation', () => {
    test('returns 400 when propertyId is missing', async () => {
      const url = new URL(
        'http://localhost/api/couples/property-reactions'
      )
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(jsonMock).toHaveBeenCalledWith(
        'propertyId is required',
        expect.objectContaining({ status: 400 })
      )
    })
  })

  describe('No household', () => {
    test('returns empty reactions when user has no household', async () => {
      // User has no household_id
      const profileChain = createChain({
        data: { id: MOCK_USER.id, household_id: null },
        error: null,
      })

      supabaseMock.from = jest.fn((table: string) => {
        if (table === 'user_profiles') return profileChain
        return createChain({ data: [], error: null })
      })

      const url = new URL(
        `http://localhost/api/couples/property-reactions?propertyId=${MOCK_PROPERTY_ID}`
      )
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(noStoreJsonMock).toHaveBeenCalledWith({
        reactions: [],
        householdId: null,
      })
    })

    test('returns empty reactions with householdId when user has household but no interactions', async () => {
      // User has household, but no interactions for this property
      const profileChain = createChain({
        data: { id: MOCK_USER.id, household_id: MOCK_HOUSEHOLD_ID },
        error: null,
      })

      const interactionsChain = createChain({
        data: [],
        error: null,
      })

      supabaseMock.from = jest.fn((table: string) => {
        if (table === 'user_profiles') return profileChain
        if (table === 'user_property_interactions') return interactionsChain
        return createChain({ data: [], error: null })
      })

      const url = new URL(
        `http://localhost/api/couples/property-reactions?propertyId=${MOCK_PROPERTY_ID}`
      )
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(noStoreJsonMock).toHaveBeenCalledWith({
        reactions: [],
        householdId: MOCK_HOUSEHOLD_ID,
      })
    })
  })

  describe('With reactions', () => {
    test('returns reactions for a property within the household', async () => {
      const userProfileChain = createChain({
        data: { id: MOCK_USER.id, household_id: MOCK_HOUSEHOLD_ID },
        error: null,
      })

      const interactionsChain = createChain({
        data: [
          {
            user_id: 'user-1',
            interaction_type: 'like',
            created_at: '2026-05-09T12:00:00Z',
          },
          {
            user_id: 'user-2',
            interaction_type: 'dislike',
            created_at: '2026-05-09T11:00:00Z',
          },
          {
            user_id: 'user-1',
            interaction_type: 'view',
            created_at: '2026-05-09T10:00:00Z',
          },
        ],
        error: null,
      })

      const profilesChain = createChain({
        data: [
          { id: 'user-1', display_name: 'Alice' },
          { id: 'user-2', display_name: 'Bob' },
        ],
        error: null,
      })

      // Track which call is for which table
      let callIndex = 0
      supabaseMock.from = jest.fn((table: string) => {
        callIndex++
        if (table === 'user_profiles' && callIndex === 1) return userProfileChain
        if (table === 'user_property_interactions') return interactionsChain
        if (table === 'user_profiles' && callIndex === 3) return profilesChain
        return createChain({ data: [], error: null })
      })

      const url = new URL(
        `http://localhost/api/couples/property-reactions?propertyId=${MOCK_PROPERTY_ID}`
      )
      const request = new NextRequest(url)
      const response = await GET(request)

      const calls = noStoreJsonMock.mock.calls
      const result = calls[calls.length - 1][0] as {
        reactions: Array<{
          user_id: string
          display_name: string
          interaction_type: string
          created_at: string
        }>
        householdId: string
      }

      expect(result.reactions).toHaveLength(2) // deduped: user-1 only first
      expect(result.reactions[0].user_id).toBe('user-1')
      expect(result.reactions[0].display_name).toBe('Alice')
      expect(result.reactions[1].display_name).toBe('Bob')
      expect(result.householdId).toBe(MOCK_HOUSEHOLD_ID)
    })

    test('defaults to "Household member" when profile has no display_name', async () => {
      const userProfileChain = createChain({
        data: { id: MOCK_USER.id, household_id: MOCK_HOUSEHOLD_ID },
        error: null,
      })

      const interactionsChain = createChain({
        data: [
          {
            user_id: 'user-3',
            interaction_type: 'skip',
            created_at: '2026-05-09T12:00:00Z',
          },
        ],
        error: null,
      })

      const profilesChain = createChain({
        data: [
          { id: 'user-3', display_name: null },
        ],
        error: null,
      })

      let callIndex = 0
      supabaseMock.from = jest.fn((table: string) => {
        callIndex++
        if (table === 'user_profiles' && callIndex === 1) return userProfileChain
        if (table === 'user_property_interactions') return interactionsChain
        if (table === 'user_profiles' && callIndex === 3) return profilesChain
        return createChain({ data: [], error: null })
      })

      const url = new URL(
        `http://localhost/api/couples/property-reactions?propertyId=${MOCK_PROPERTY_ID}`
      )
      const request = new NextRequest(url)
      await GET(request)

      const calls = noStoreJsonMock.mock.calls
      const result = calls[calls.length - 1][0] as {
        reactions: Array<{ display_name: string }>
      }

      expect(result.reactions[0].display_name).toBe('Household member')
    })
  })

  describe('Server errors', () => {
    test('returns 500 when profile fetch fails', async () => {
      const profileChain = createChain({
        data: null,
        error: { message: 'Database connection error' },
      })

      supabaseMock.from = jest.fn(() => profileChain)

      const url = new URL(
        `http://localhost/api/couples/property-reactions?propertyId=${MOCK_PROPERTY_ID}`
      )
      const request = new NextRequest(url)
      await GET(request)

      // Should call serverError
      const calls = jsonMock.mock.calls
      const errorCall = calls.find(
        (c) => c[1] && (c[1] as { status: number }).status === 500
      )
      expect(errorCall).toBeDefined()
    })
  })

  describe('Method rejection', () => {
    test('POST returns method not allowed', async () => {
      const { POST } = await import(
        '@/app/api/couples/property-reactions/route'
      )
      await POST()
      expect(jsonMock).toHaveBeenCalledWith(
        'Method not allowed',
        expect.objectContaining({ status: 405 })
      )
    })

    test('PUT returns method not allowed', async () => {
      const { PUT } = await import(
        '@/app/api/couples/property-reactions/route'
      )
      await PUT()
      expect(jsonMock).toHaveBeenCalledWith(
        'Method not allowed',
        expect.objectContaining({ status: 405 })
      )
    })

    test('DELETE returns method not allowed', async () => {
      const { DELETE } = await import(
        '@/app/api/couples/property-reactions/route'
      )
      await DELETE()
      expect(jsonMock).toHaveBeenCalledWith(
        'Method not allowed',
        expect.objectContaining({ status: 405 })
      )
    })

    test('PATCH returns method not allowed', async () => {
      const { PATCH } = await import(
        '@/app/api/couples/property-reactions/route'
      )
      await PATCH()
      expect(jsonMock).toHaveBeenCalledWith(
        'Method not allowed',
        expect.objectContaining({ status: 405 })
      )
    })
  })
})
