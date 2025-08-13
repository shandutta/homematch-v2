import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/couples/mutual-likes/route'
import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'
import { NextRequest } from 'next/server'

// Mock the dependencies
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/services/couples')

const mockCreateApiClient = vi.mocked(createApiClient)
const mockCouplesService = vi.mocked(CouplesService)

describe('/api/couples/mutual-likes', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  const mockMutualLikes = [
    {
      property_id: 'prop-1',
      liked_by_count: 2,
      first_liked_at: '2024-01-01T00:00:00.000Z',
      last_liked_at: '2024-01-02T00:00:00.000Z',
      user_ids: ['user-123', 'user-456'],
    },
    {
      property_id: 'prop-2',
      liked_by_count: 3,
      first_liked_at: '2024-01-03T00:00:00.000Z',
      last_liked_at: '2024-01-04T00:00:00.000Z',
      user_ids: ['user-123', 'user-456', 'user-789'],
    },
  ]

  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateApiClient.mockReturnValue(mockSupabaseClient as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Authentication', () => {
    test('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized'),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should return 401 when auth returns error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error'),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Successful Requests', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
    })

    test('should return mutual likes without property details by default', async () => {
      mockCouplesService.getMutualLikes.mockResolvedValue(mockMutualLikes)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toEqual(mockMutualLikes)
      expect(data.performance).toEqual({
        totalTime: expect.any(Number),
        cached: expect.any(Boolean),
        count: 2,
      })
      expect(mockCouplesService.getMutualLikes).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUser.id
      )
    })

    test('should return empty array when no mutual likes exist', async () => {
      mockCouplesService.getMutualLikes.mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toEqual([])
      expect(data.performance.cached).toBe(false)
    })

    test('should include property details when requested', async () => {
      const mockProperties = [
        {
          id: 'prop-1',
          address: '123 Main St',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1500,
          property_type: 'house',
          images: ['/image1.jpg'],
          listing_status: 'active',
        },
        {
          id: 'prop-2',
          address: '456 Oak Ave',
          price: 750000,
          bedrooms: 4,
          bathrooms: 3,
          square_feet: 2000,
          property_type: 'house',
          images: ['/image2.jpg'],
          listing_status: 'active',
        },
      ]

      mockCouplesService.getMutualLikes.mockResolvedValue(mockMutualLikes)
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: mockProperties,
          error: null,
        }),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes?includeProperties=true',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toHaveLength(2)
      expect(data.mutualLikes[0]).toHaveProperty('property')
      expect(data.mutualLikes[0].property).toEqual(mockProperties[0])
      expect(data.mutualLikes[1].property).toEqual(mockProperties[1])
    })

    test('should handle missing properties gracefully', async () => {
      mockCouplesService.getMutualLikes.mockResolvedValue(mockMutualLikes)
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [], // No matching properties found
          error: null,
        }),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes?includeProperties=true',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toHaveLength(2)
      expect(data.mutualLikes[0].property).toBeNull()
      expect(data.mutualLikes[1].property).toBeNull()
    })

    test('should continue without properties when property fetch fails', async () => {
      mockCouplesService.getMutualLikes.mockResolvedValue(mockMutualLikes)
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes?includeProperties=true',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toEqual(mockMutualLikes)
    })
  })

  describe('Query Parameters', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockCouplesService.getMutualLikes.mockResolvedValue(mockMutualLikes)
    })

    test('should include properties by default', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      await GET(request)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('properties')
    })

    test('should exclude properties when includeProperties=false', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes?includeProperties=false',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes).toEqual(mockMutualLikes)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
    })

    test('should return 500 when CouplesService throws error', async () => {
      mockCouplesService.getMutualLikes.mockRejectedValue(
        new Error('Service error')
      )

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch mutual likes')
    })

    test('should return 500 when unexpected error occurs', async () => {
      mockCreateApiClient.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch mutual likes')
    })
  })

  describe('Performance Metrics', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
    })

    test('should include performance metrics in response', async () => {
      mockCouplesService.getMutualLikes.mockResolvedValue(mockMutualLikes)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.performance).toEqual({
        totalTime: expect.any(Number),
        cached: expect.any(Boolean),
        count: expect.any(Number),
      })
      expect(data.performance.totalTime).toBeGreaterThan(0)
      expect(data.performance.count).toBe(2)
    })

    test('should mark fast responses as potentially cached', async () => {
      // Mock a very fast response by using timer manipulation
      const originalNow = Date.now
      let callCount = 0
      Date.now = vi.fn(() => {
        callCount++
        return callCount === 1 ? 1000 : 1050 // 50ms response
      })

      mockCouplesService.getMutualLikes.mockResolvedValue(mockMutualLikes)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.performance.cached).toBe(true)
      expect(data.performance.totalTime).toBeLessThan(100)

      // Restore original Date.now
      Date.now = originalNow
    })
  })

  describe('Data Consistency', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
    })

    test('should match mutual likes with properties correctly', async () => {
      const properties = [
        {
          id: 'prop-1',
          address: '123 Main St',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1500,
          property_type: 'house',
          images: [],
          listing_status: 'active',
        },
        {
          id: 'prop-different',
          address: '999 Different St',
          price: 300000,
          bedrooms: 2,
          bathrooms: 1,
          square_feet: 1000,
          property_type: 'condo',
          images: [],
          listing_status: 'active',
        },
      ]

      mockCouplesService.getMutualLikes.mockResolvedValue(mockMutualLikes)
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: properties,
          error: null,
        }),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes?includeProperties=true',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mutualLikes[0].property).toEqual(properties[0]) // prop-1 matches
      expect(data.mutualLikes[1].property).toBeNull() // prop-2 doesn't match
    })
  })
})
