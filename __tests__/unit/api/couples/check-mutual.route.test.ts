import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import type { NextRequest } from 'next/server'

// Mock next/server before imports
jest.mock('next/server', () => {
  const makeResponse = (body: unknown, init?: { status?: number }) => {
    const status = init?.status ?? 200
    return {
      status,
      json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
      headers: new Map([['content-type', 'application/json']]),
    }
  }

  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) =>
        makeResponse(body, init),
    },
  }
})

// Mock Supabase with inline jest.fn() - these get hoisted properly
jest.mock('@/lib/supabase/server', () => ({
  createApiClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  })),
}))

// Mock CouplesService with inline jest.fn()
jest.mock('@/lib/services/couples', () => ({
  CouplesService: {
    checkPotentialMutualLike: jest.fn(),
    getHouseholdStats: jest.fn(),
  },
}))

// Import after mocks
import * as checkMutualRoute from '@/app/api/couples/check-mutual/route'
import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'

// Get references to the mock functions
const mockGetUser = (createApiClient as jest.Mock)().auth.getUser as jest.Mock
const mockSupabaseFrom = (createApiClient as jest.Mock)().from as jest.Mock
const mockCheckPotentialMutualLike =
  CouplesService.checkPotentialMutualLike as jest.Mock
const mockGetHouseholdStats = CouplesService.getHouseholdStats as jest.Mock

describe('/api/couples/check-mutual route', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset the mock client for each test
    ;(createApiClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
      from: mockSupabaseFrom,
    })

    // Setup default from() mock chain
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })
  })

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = {
        nextUrl: { searchParams: new URLSearchParams('propertyId=prop-123') },
      } as unknown as NextRequest

      const response = await checkMutualRoute.GET(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 400 when propertyId is missing', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest

      const response = await checkMutualRoute.GET(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Property ID is required')
    })

    it('returns isMutual: false when no mutual like would occur', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockCheckPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: false,
        partnerUserId: undefined,
      })

      const request = {
        nextUrl: { searchParams: new URLSearchParams('propertyId=prop-123') },
      } as unknown as NextRequest

      const response = await checkMutualRoute.GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.isMutual).toBe(false)
      expect(body.partnerName).toBeUndefined()
    })

    it('returns mutual like details when partner has liked', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockCheckPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: true,
        partnerUserId: 'partner-456',
      })
      mockGetHouseholdStats.mockResolvedValue({
        total_mutual_likes: 5,
        activity_streak_days: 3,
      })

      // Mock user_profiles query for partner details
      const selectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              display_name: 'Partner Name',
              email: 'partner@example.com',
            },
            error: null,
          }),
        }),
      })

      // Mock properties query for property details
      const propertiesSelectMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { address: '123 Main St' },
            error: null,
          }),
        }),
      })

      mockSupabaseFrom
        .mockReturnValueOnce({ select: selectMock })
        .mockReturnValueOnce({ select: propertiesSelectMock })

      const request = {
        nextUrl: { searchParams: new URLSearchParams('propertyId=prop-123') },
      } as unknown as NextRequest

      const response = await checkMutualRoute.GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.isMutual).toBe(true)
      expect(body.partnerName).toBe('Partner Name')
      expect(body.propertyAddress).toBe('123 Main St')
      expect(body.streak).toBe(3)
    })

    it('returns milestone when total mutual likes is divisible by 5', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockCheckPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: true,
        partnerUserId: 'partner-456',
      })
      mockGetHouseholdStats.mockResolvedValue({
        total_mutual_likes: 10, // Milestone at every 5
        activity_streak_days: 5,
      })

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { display_name: 'Partner', email: 'partner@example.com' },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { address: '456 Oak Ave' },
                error: null,
              }),
            }),
          }),
        })

      const request = {
        nextUrl: { searchParams: new URLSearchParams('propertyId=prop-123') },
      } as unknown as NextRequest

      const response = await checkMutualRoute.GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.milestone).toEqual({ type: 'mutual_likes', count: 10 })
    })

    it('returns 500 when service throws an error', async () => {
      const mockUser = { id: 'user-error', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockCheckPotentialMutualLike.mockRejectedValue(new Error('Service error'))

      const request = {
        nextUrl: { searchParams: new URLSearchParams('propertyId=prop-123') },
      } as unknown as NextRequest

      const response = await checkMutualRoute.GET(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to check mutual like')
    })

    it('falls back to email when display_name is not available', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockCheckPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: true,
        partnerUserId: 'partner-456',
      })
      mockGetHouseholdStats.mockResolvedValue({
        total_mutual_likes: 3,
        activity_streak_days: 1,
      })

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { display_name: null, email: 'partner@example.com' },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { address: '789 Pine St' },
                error: null,
              }),
            }),
          }),
        })

      const request = {
        nextUrl: { searchParams: new URLSearchParams('propertyId=prop-123') },
      } as unknown as NextRequest

      const response = await checkMutualRoute.GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.partnerName).toBe('partner@example.com')
    })
  })
})
