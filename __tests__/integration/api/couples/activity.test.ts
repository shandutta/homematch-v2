import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/couples/activity/route'
import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'
import { NextRequest } from 'next/server'

// Mock the dependencies
vi.mock('@/lib/supabase/server')
vi.mock('@/lib/services/couples')

const mockCreateApiClient = vi.mocked(createApiClient)
const mockCouplesService = vi.mocked(CouplesService)

describe('/api/couples/activity', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  const mockActivity = [
    {
      id: 'activity-1',
      user_id: 'user-123',
      property_id: 'prop-1',
      interaction_type: 'like',
      created_at: '2024-01-01T00:00:00.000Z',
      user_display_name: 'John Doe',
      user_email: 'john@example.com',
      property_address: '123 Main St',
      property_price: 500000,
      property_bedrooms: 3,
      property_bathrooms: 2,
      property_images: ['/image1.jpg'],
      is_mutual: false,
    },
    {
      id: 'activity-2',
      user_id: 'user-456',
      property_id: 'prop-2',
      interaction_type: 'like',
      created_at: '2024-01-02T00:00:00.000Z',
      user_display_name: 'Jane Doe',
      user_email: 'jane@example.com',
      property_address: '456 Oak Ave',
      property_price: 750000,
      property_bedrooms: 4,
      property_bathrooms: 3,
      property_images: ['/image2.jpg'],
      is_mutual: true,
    },
  ]

  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
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
        'http://localhost:3000/api/couples/activity',
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
        'http://localhost:3000/api/couples/activity',
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

    test('should return household activity with default parameters', async () => {
      mockCouplesService.getHouseholdActivity.mockResolvedValue(mockActivity)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.activity).toEqual(mockActivity)
      expect(data.performance).toEqual({
        totalTime: expect.any(Number),
        cached: expect.any(Boolean),
        count: 2,
      })
      expect(mockCouplesService.getHouseholdActivity).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUser.id,
        20, // default limit
        0 // default offset
      )
    })

    test('should return empty array when no activity exists', async () => {
      mockCouplesService.getHouseholdActivity.mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.activity).toEqual([])
      expect(data.performance.cached).toBe(true) // Fast response is marked as cached
      expect(data.performance.count).toBe(0)
    })

    test('should respect limit and offset query parameters', async () => {
      mockCouplesService.getHouseholdActivity.mockResolvedValue(
        mockActivity.slice(0, 1)
      )

      const url = new URL(
        'http://localhost:3000/api/couples/activity?limit=10&offset=5'
      )
      const request = new NextRequest(url, { method: 'GET' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.activity).toHaveLength(1)
      expect(mockCouplesService.getHouseholdActivity).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUser.id,
        10, // specified limit
        5 // specified offset
      )
    })

    test('should handle invalid limit and offset parameters gracefully', async () => {
      mockCouplesService.getHouseholdActivity.mockResolvedValue(mockActivity)

      const url = new URL(
        'http://localhost:3000/api/couples/activity?limit=invalid&offset=also-invalid'
      )
      const request = new NextRequest(url, { method: 'GET' })

      const response = await GET(request)
      await response.json()

      expect(response.status).toBe(200)
      expect(mockCouplesService.getHouseholdActivity).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUser.id,
        20, // falls back to default
        0 // falls back to default
      )
    })

    test('should enforce maximum limit', async () => {
      mockCouplesService.getHouseholdActivity.mockResolvedValue([])

      const url = new URL(
        'http://localhost:3000/api/couples/activity?limit=200'
      )
      const request = new NextRequest(url, { method: 'GET' })

      await GET(request)

      expect(mockCouplesService.getHouseholdActivity).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUser.id,
        100, // capped at maximum
        0
      )
    })

    test('should enforce minimum values for limit and offset', async () => {
      mockCouplesService.getHouseholdActivity.mockResolvedValue([])

      const url = new URL(
        'http://localhost:3000/api/couples/activity?limit=-5&offset=-10'
      )
      const request = new NextRequest(url, { method: 'GET' })

      await GET(request)

      expect(mockCouplesService.getHouseholdActivity).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUser.id,
        1, // minimum limit
        0 // minimum offset
      )
    })
  })

  describe('Query Parameter Validation', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockCouplesService.getHouseholdActivity.mockResolvedValue([])
    })

    test('should handle missing query parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
        { method: 'GET' }
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockCouplesService.getHouseholdActivity).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUser.id,
        20, // default limit
        0 // default offset
      )
    })

    test('should handle partial query parameters', async () => {
      const url = new URL('http://localhost:3000/api/couples/activity?limit=15')
      const request = new NextRequest(url, { method: 'GET' })

      await GET(request)

      expect(mockCouplesService.getHouseholdActivity).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUser.id,
        15, // specified limit
        0 // default offset
      )
    })

    test('should handle zero limit and offset', async () => {
      const url = new URL(
        'http://localhost:3000/api/couples/activity?limit=0&offset=0'
      )
      const request = new NextRequest(url, { method: 'GET' })

      await GET(request)

      expect(mockCouplesService.getHouseholdActivity).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUser.id,
        1, // minimum limit is 1
        0 // offset can be 0
      )
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
      mockCouplesService.getHouseholdActivity.mockRejectedValue(
        new Error('Service error')
      )

      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch household activity')
    })

    test('should return 500 when unexpected error occurs', async () => {
      mockCreateApiClient.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch household activity')
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
      mockCouplesService.getHouseholdActivity.mockResolvedValue(mockActivity)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.performance).toEqual({
        totalTime: expect.any(Number),
        cached: expect.any(Boolean),
        count: expect.any(Number),
      })
      expect(data.performance.totalTime).toBeGreaterThanOrEqual(0) // Can be 0 in mocked environment
      expect(data.performance.count).toBe(2)
    })

    test('should mark fast responses as potentially cached', async () => {
      // Mock a very fast response
      const originalNow = Date.now
      let callCount = 0
      Date.now = vi.fn(() => {
        callCount++
        return callCount === 1 ? 1000 : 1050 // 50ms response
      })

      mockCouplesService.getHouseholdActivity.mockResolvedValue(mockActivity)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
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

  describe('Activity Data Structure', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
    })

    test('should return activity with all expected fields', async () => {
      mockCouplesService.getHouseholdActivity.mockResolvedValue(mockActivity)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.activity).toHaveLength(2)

      const firstActivity = data.activity[0]
      expect(firstActivity).toHaveProperty('id')
      expect(firstActivity).toHaveProperty('user_id')
      expect(firstActivity).toHaveProperty('property_id')
      expect(firstActivity).toHaveProperty('interaction_type')
      expect(firstActivity).toHaveProperty('created_at')
      expect(firstActivity).toHaveProperty('user_display_name')
      expect(firstActivity).toHaveProperty('user_email')
      expect(firstActivity).toHaveProperty('property_address')
      expect(firstActivity).toHaveProperty('property_price')
      expect(firstActivity).toHaveProperty('property_bedrooms')
      expect(firstActivity).toHaveProperty('property_bathrooms')
      expect(firstActivity).toHaveProperty('property_images')
      expect(firstActivity).toHaveProperty('is_mutual')
    })

    test('should include mutual like indicators', async () => {
      mockCouplesService.getHouseholdActivity.mockResolvedValue(mockActivity)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.activity[0].is_mutual).toBe(false)
      expect(data.activity[1].is_mutual).toBe(true)
    })

    test('should preserve activity order from service', async () => {
      const orderedActivity = [
        { ...mockActivity[1], created_at: '2024-01-02T00:00:00.000Z' },
        { ...mockActivity[0], created_at: '2024-01-01T00:00:00.000Z' },
      ]
      mockCouplesService.getHouseholdActivity.mockResolvedValue(orderedActivity)

      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
        { method: 'GET' }
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.activity[0].created_at).toBe('2024-01-02T00:00:00.000Z')
      expect(data.activity[1].created_at).toBe('2024-01-01T00:00:00.000Z')
    })
  })

  describe('Pagination', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
    })

    test('should work with pagination parameters', async () => {
      // Simulate paginated results
      const firstPage = [mockActivity[0]]
      const secondPage = [mockActivity[1]]

      // First request (page 1)
      mockCouplesService.getHouseholdActivity.mockResolvedValueOnce(firstPage)

      const request1 = new NextRequest(
        'http://localhost:3000/api/couples/activity?limit=1&offset=0',
        { method: 'GET' }
      )

      const response1 = await GET(request1)
      const data1 = await response1.json()

      expect(data1.activity).toHaveLength(1)
      expect(data1.activity[0].id).toBe('activity-1')

      // Second request (page 2)
      mockCouplesService.getHouseholdActivity.mockResolvedValueOnce(secondPage)

      const request2 = new NextRequest(
        'http://localhost:3000/api/couples/activity?limit=1&offset=1',
        { method: 'GET' }
      )

      const response2 = await GET(request2)
      const data2 = await response2.json()

      expect(data2.activity).toHaveLength(1)
      expect(data2.activity[0].id).toBe('activity-2')
    })
  })
})
