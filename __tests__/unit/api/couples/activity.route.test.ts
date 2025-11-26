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

// Mock rate limiter - passthrough implementation
jest.mock('@/lib/middleware/rateLimiter', () => ({
  withRateLimit: <T>(_request: unknown, handler: () => Promise<T>) => handler(),
}))

// Mock Supabase with inline jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createApiClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}))

// Mock CouplesService with inline jest.fn()
jest.mock('@/lib/services/couples', () => ({
  CouplesService: {
    getHouseholdActivity: jest.fn(),
  },
}))

// Import after mocks
import * as activityRoute from '@/app/api/couples/activity/route'
import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'

// Get references to the mock functions
const mockGetUser = (createApiClient as jest.Mock)().auth.getUser as jest.Mock
const mockGetHouseholdActivity =
  CouplesService.getHouseholdActivity as jest.Mock

describe('/api/couples/activity route', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset the mock client for each test
    ;(createApiClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    })
  })

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest

      const response = await activityRoute.GET(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns activity data with default pagination', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockActivity = [
        {
          id: 'activity-1',
          user_id: 'user-123',
          property_id: 'prop-1',
          interaction_type: 'like',
          created_at: '2024-01-15T12:00:00Z',
          user_display_name: 'Test User',
          property_address: '123 Main St',
          property_price: 500000,
          property_bedrooms: 3,
          property_bathrooms: 2,
          property_images: ['https://example.com/image1.jpg'],
        },
      ]
      mockGetHouseholdActivity.mockResolvedValue(mockActivity)

      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest

      const response = await activityRoute.GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.activity).toEqual(mockActivity)
      expect(body.performance).toBeDefined()
      expect(body.performance.count).toBe(1)

      // Verify default pagination was used (checking args except supabase client)
      expect(mockGetHouseholdActivity).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        20, // default limit
        0 // default offset
      )
    })

    it('respects custom limit and offset parameters', async () => {
      const mockUser = { id: 'user-456', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockGetHouseholdActivity.mockResolvedValue([])

      const request = {
        nextUrl: { searchParams: new URLSearchParams('limit=50&offset=10') },
      } as unknown as NextRequest

      await activityRoute.GET(request)

      expect(mockGetHouseholdActivity).toHaveBeenCalledWith(
        expect.anything(),
        'user-456',
        50,
        10
      )
    })

    it('clamps limit to valid range (1-100)', async () => {
      const mockUser = { id: 'user-789', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockGetHouseholdActivity.mockResolvedValue([])

      // Test limit > 100 gets clamped to 100
      const request1 = {
        nextUrl: { searchParams: new URLSearchParams('limit=200') },
      } as unknown as NextRequest

      await activityRoute.GET(request1)

      expect(mockGetHouseholdActivity).toHaveBeenLastCalledWith(
        expect.anything(),
        'user-789',
        100, // clamped to max
        0
      )

      // Test limit < 1 gets clamped to 1
      const request2 = {
        nextUrl: { searchParams: new URLSearchParams('limit=0') },
      } as unknown as NextRequest

      await activityRoute.GET(request2)

      expect(mockGetHouseholdActivity).toHaveBeenLastCalledWith(
        expect.anything(),
        'user-789',
        1, // clamped to min
        0
      )
    })

    it('ensures offset is non-negative', async () => {
      const mockUser = { id: 'user-abc', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockGetHouseholdActivity.mockResolvedValue([])

      const request = {
        nextUrl: { searchParams: new URLSearchParams('offset=-5') },
      } as unknown as NextRequest

      await activityRoute.GET(request)

      expect(mockGetHouseholdActivity).toHaveBeenCalledWith(
        expect.anything(),
        'user-abc',
        20,
        0 // negative offset clamped to 0
      )
    })

    it('returns 500 when service throws an error', async () => {
      const mockUser = { id: 'user-error', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockGetHouseholdActivity.mockRejectedValue(new Error('Database error'))

      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest

      const response = await activityRoute.GET(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to fetch household activity')
    })

    it('handles invalid limit/offset strings gracefully', async () => {
      const mockUser = { id: 'user-parse', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockGetHouseholdActivity.mockResolvedValue([])

      const request = {
        nextUrl: {
          searchParams: new URLSearchParams('limit=abc&offset=xyz'),
        },
      } as unknown as NextRequest

      await activityRoute.GET(request)

      // Invalid values should fall back to defaults
      expect(mockGetHouseholdActivity).toHaveBeenCalledWith(
        expect.anything(),
        'user-parse',
        20, // default limit
        0 // default offset
      )
    })
  })
})
