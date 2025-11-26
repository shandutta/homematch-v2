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
    getHouseholdStats: jest.fn(),
  },
}))

// Import after mocks
import * as statsRoute from '@/app/api/couples/stats/route'
import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'

// Get references to the mock functions
const mockGetUser = (createApiClient as jest.Mock)().auth.getUser as jest.Mock
const mockGetHouseholdStats = CouplesService.getHouseholdStats as jest.Mock

describe('/api/couples/stats route', () => {
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

      const request = {} as unknown as NextRequest

      const response = await statsRoute.GET(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns stats when user is authenticated and in household', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockStats = {
        total_mutual_likes: 5,
        total_household_likes: 25,
        activity_streak_days: 3,
        last_mutual_like_at: '2024-01-15T12:00:00Z',
      }
      mockGetHouseholdStats.mockResolvedValue(mockStats)

      const request = {} as unknown as NextRequest

      const response = await statsRoute.GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats).toEqual(mockStats)
    })

    it('returns 404 when user has no household', async () => {
      const mockUser = { id: 'user-456', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockGetHouseholdStats.mockResolvedValue(null)

      const request = {} as unknown as NextRequest

      const response = await statsRoute.GET(request)

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe('Household not found or no statistics available')
    })

    it('returns 500 when service throws an error', async () => {
      const mockUser = { id: 'user-error', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockGetHouseholdStats.mockRejectedValue(new Error('Database error'))

      const request = {} as unknown as NextRequest

      const response = await statsRoute.GET(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to fetch household statistics')
    })

    it('handles auth error correctly', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      })

      const request = {} as unknown as NextRequest

      const response = await statsRoute.GET(request)

      expect(response.status).toBe(401)
    })

    it('returns stats with zero values for new households', async () => {
      const mockUser = { id: 'user-new', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const emptyStats = {
        total_mutual_likes: 0,
        total_household_likes: 0,
        activity_streak_days: 0,
        last_mutual_like_at: null,
      }
      mockGetHouseholdStats.mockResolvedValue(emptyStats)

      const request = {} as unknown as NextRequest

      const response = await statsRoute.GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.stats.total_mutual_likes).toBe(0)
      expect(body.stats.last_mutual_like_at).toBeNull()
    })
  })
})
