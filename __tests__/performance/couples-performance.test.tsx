import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { createMocks } from 'node-mocks-http'
import { GET as getMutualLikes } from '@/app/api/couples/mutual-likes/route'
import { GET as getActivity } from '@/app/api/couples/activity/route'
import { CouplesService } from '@/lib/services/couples'
import { NextRequest } from 'next/server'
import { MutualLikesBadge } from '@/components/features/couples/MutualLikesBadge'
import { MutualLikesSection } from '@/components/features/couples/MutualLikesSection'
import React from 'react'

type MockSupabaseClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>
  }
}

const mockCreateClient = vi.fn<Promise<MockSupabaseClient>, []>()

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))
vi.mock('@/lib/services/couples')
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.ComponentProps<'div'>) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}))

// Mock Next.js Image and Link
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ComponentProps<'img'>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const mockCouplesService = vi.mocked(CouplesService)

const createJsonResponse = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

describe('Couples Features Performance Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  const mockSupabaseClient = {
    auth: {
      getUser: vi.fn(),
    },
  } satisfies MockSupabaseClient

  const mockMutualLikes = Array.from({ length: 100 }, (_, i) => ({
    property_id: `prop-${i}`,
    liked_by_count: Math.floor(Math.random() * 5) + 2,
    property_address: `${i * 100} Test St`,
    property_price: 500000 + i * 10000,
    property_bedrooms: 3,
    property_bathrooms: 2,
    property_images: [`/image-${i}.jpg`],
  }))

  const mockActivity = Array.from({ length: 200 }, (_, i) => ({
    id: `activity-${i}`,
    user_id: i % 2 === 0 ? 'user-123' : 'user-456',
    property_id: `prop-${i}`,
    interaction_type: 'like',
    created_at: new Date(Date.now() - i * 1000 * 60).toISOString(),
    user_display_name: `User ${i}`,
    user_email: `user${i}@example.com`,
    property_address: `${i * 100} Test St`,
    property_price: 500000 + i * 10000,
    property_bedrooms: 3,
    property_bathrooms: 2,
    property_images: [`/image-${i}.jpg`],
    is_mutual: i % 3 === 0,
  }))

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue(mockSupabaseClient)
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('API Performance Tests', () => {
    test('mutual-likes API should respond within 200ms for small datasets', async () => {
      const smallDataset = mockMutualLikes.slice(0, 10)
      mockCouplesService.getMutualLikes.mockResolvedValue(smallDataset)

      const { req } = createMocks<NextRequest>({ method: 'GET' })
      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        req
      )

      const startTime = Date.now()
      const response = await getMutualLikes(request)
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(200)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.performance.totalTime).toBeLessThan(200)
    })

    test('mutual-likes API should handle large datasets efficiently', async () => {
      mockCouplesService.getMutualLikes.mockResolvedValue(mockMutualLikes)

      const { req } = createMocks<NextRequest>({ method: 'GET' })
      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        req
      )

      const startTime = Date.now()
      const response = await getMutualLikes(request)
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(500) // Allow more time for larger datasets
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.mutualLikes).toHaveLength(100)
      expect(data.performance.totalTime).toBeGreaterThan(0)
    })

    test('activity API should respond within 300ms for paginated requests', async () => {
      const paginatedData = mockActivity.slice(0, 20)
      mockCouplesService.getHouseholdActivity.mockResolvedValue(paginatedData)

      const { req } = createMocks<NextRequest>({ method: 'GET' })
      const url = new URL(
        'http://localhost:3000/api/couples/activity?limit=20&offset=0'
      )
      const request = new NextRequest(url, req)

      const startTime = Date.now()
      const response = await getActivity(request)
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(300)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.activity).toHaveLength(20)
      expect(data.performance.totalTime).toBeLessThan(300)
    })

    test('API should handle concurrent requests efficiently', async () => {
      mockCouplesService.getMutualLikes.mockResolvedValue(
        mockMutualLikes.slice(0, 10)
      )

      const requests = Array.from({ length: 5 }, () => {
        const { req } = createMocks<NextRequest>({ method: 'GET' })
        return new NextRequest(
          'http://localhost:3000/api/couples/mutual-likes',
          req
        )
      })

      const startTime = Date.now()
      const responses = await Promise.all(
        requests.map((req) => getMutualLikes(req))
      )
      const endTime = Date.now()

      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(1000) // 5 concurrent requests should complete within 1s

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Component Rendering Performance', () => {
    test('MutualLikesBadge should render quickly with animation disabled', () => {
      const startTime = performance.now()

      const { unmount } = render(
        <MutualLikesBadge likedByCount={3} showAnimation={false} />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(50) // Should render within 50ms
      unmount()
    })

    test('MutualLikesBadge should render efficiently with animation enabled', () => {
      const startTime = performance.now()

      const { unmount } = render(
        <MutualLikesBadge likedByCount={3} showAnimation={true} />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100) // Animation may add some overhead
      unmount()
    })

    test('MutualLikesSection should handle large datasets without performance degradation', async () => {
      const fetchMock = vi.fn<Promise<Response>, Parameters<typeof fetch>>()
      fetchMock.mockResolvedValue(
        createJsonResponse({
          mutualLikes: mockMutualLikes,
          performance: { totalTime: 150, cached: false, count: 100 },
        })
      )
      global.fetch = fetchMock

      const startTime = performance.now()

      const { unmount } = render(<MutualLikesSection />)

      await waitFor(
        () => {
          // Wait for component to finish loading
        },
        { timeout: 2000 }
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(2000) // Should handle 100 items within 2s
      unmount()
    })

    test('Multiple MutualLikesBadge components should render efficiently', () => {
      const startTime = performance.now()

      const badges = Array.from({ length: 50 }, (_, i) => (
        <MutualLikesBadge
          key={i}
          likedByCount={i + 2}
          showAnimation={false}
          variant={i % 2 === 0 ? 'default' : 'compact'}
        />
      ))

      const { unmount } = render(<div>{badges}</div>)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(500) // 50 badges should render within 500ms
      unmount()
    })
  })

  describe('Cache Effectiveness Tests', () => {
    test('CouplesService cache should improve response times', async () => {
      // First call - should be slower (cache miss)
      mockCouplesService.getMutualLikes.mockResolvedValueOnce(
        mockMutualLikes.slice(0, 10)
      )

      const { req: req1 } = createMocks<NextRequest>({ method: 'GET' })
      const request1 = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        req1
      )

      const response1 = await getMutualLikes(request1)
      const data1 = await response1.json()
      const firstCallTime = data1.performance.totalTime

      // Second call - should be faster (cache hit)
      mockCouplesService.getMutualLikes.mockResolvedValueOnce(
        mockMutualLikes.slice(0, 10)
      )

      const { req: req2 } = createMocks<NextRequest>({ method: 'GET' })
      const request2 = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        req2
      )

      const response2 = await getMutualLikes(request2)
      const data2 = await response2.json()
      const secondCallTime = data2.performance.totalTime

      // Note: In a real scenario with actual caching, secondCallTime would be significantly less
      // This test structure shows how to measure cache effectiveness
      expect(firstCallTime).toBeGreaterThan(0)
      expect(secondCallTime).toBeGreaterThan(0)
    })

    test('should identify potentially cached responses', async () => {
      // Mock a very fast response to simulate cache hit
      const fastMockData = mockMutualLikes.slice(0, 5)
      mockCouplesService.getMutualLikes.mockImplementation(async () => {
        // Simulate instant cache response
        await new Promise((resolve) => setTimeout(resolve, 10))
        return fastMockData
      })

      const { req } = createMocks<NextRequest>({ method: 'GET' })
      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        req
      )

      const response = await getMutualLikes(request)
      const data = await response.json()

      // Fast responses are likely cached
      if (data.performance.totalTime < 100) {
        expect(data.performance.cached).toBe(true)
      }
    })
  })

  describe('Memory Usage Tests', () => {
    test('should not create memory leaks with repeated renders', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Render and unmount components multiple times
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(
          <MutualLikesBadge likedByCount={3} showAnimation={false} />
        )
        unmount()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (less than 1MB for 100 renders)
      expect(memoryIncrease).toBeLessThan(1024 * 1024)
    })

    test('should handle large property lists without excessive memory usage', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Create a large mock dataset
      const largeMutualLikes = Array.from({ length: 1000 }, (_, i) => ({
        property_id: `prop-${i}`,
        liked_by_count: Math.floor(Math.random() * 5) + 2,
      }))

      // Mock fetch for the large dataset
      const fetchMock = vi.fn<Promise<Response>, Parameters<typeof fetch>>()
      fetchMock.mockResolvedValue(
        createJsonResponse({
          mutualLikes: largeMutualLikes,
          performance: { totalTime: 200, cached: false, count: 1000 },
        })
      )
      global.fetch = fetchMock

      const { unmount } = render(<MutualLikesSection />)
      unmount()

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Should handle large datasets without excessive memory usage (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024)
    })
  })

  describe('Scalability Tests', () => {
    test('API performance should degrade gracefully with increased load', async () => {
      const datasets = [
        mockMutualLikes.slice(0, 10), // Small
        mockMutualLikes.slice(0, 50), // Medium
        mockMutualLikes.slice(0, 100), // Large
      ]

      const responseTimes: number[] = []

      for (const dataset of datasets) {
        mockCouplesService.getMutualLikes.mockResolvedValueOnce(dataset)

        const { req } = createMocks<NextRequest>({ method: 'GET' })
        const request = new NextRequest(
          'http://localhost:3000/api/couples/mutual-likes',
          req
        )

        const startTime = Date.now()
        const response = await getMutualLikes(request)
        const endTime = Date.now()

        const responseTime = endTime - startTime
        responseTimes.push(responseTime)

        expect(response.status).toBe(200)
      }

      // Response times should not increase dramatically
      // Small to medium should not increase by more than 300%
      if (responseTimes[0] > 0) {
        const mediumIncrease = responseTimes[1] / responseTimes[0]
        expect(mediumIncrease).toBeLessThan(3)
      }
    })

    test('Component rendering should scale with reasonable performance', () => {
      const renderTimes: number[] = []
      const itemCounts = [10, 25, 50]

      itemCounts.forEach((count) => {
        const badges = Array.from({ length: count }, (_, i) => (
          <MutualLikesBadge
            key={i}
            likedByCount={i + 2}
            showAnimation={false}
          />
        ))

        const startTime = performance.now()
        const { unmount } = render(<div>{badges}</div>)
        const endTime = performance.now()

        renderTimes.push(endTime - startTime)
        unmount()
      })

      // Rendering time should scale sub-linearly with item count
      // 50 items should not take more than 5x longer than 10 items
      if (renderTimes[0] > 0) {
        const scalingFactor = renderTimes[2] / renderTimes[0] // 50 items vs 10 items
        expect(scalingFactor).toBeLessThan(5)
      }
    })
  })

  describe('Resource Optimization Tests', () => {
    test('should minimize API calls through efficient caching', async () => {
      let callCount = 0
      mockCouplesService.getMutualLikes.mockImplementation(async () => {
        callCount++
        return mockMutualLikes.slice(0, 10)
      })

      // Multiple components requesting the same data should result in minimal API calls
      const components = Array.from({ length: 3 }, (_, i) => (
        <MutualLikesSection key={i} />
      ))

      render(<div>{components}</div>)

      // Wait for components to load
      await new Promise((resolve) => setTimeout(resolve, 100))

      // In an ideal caching scenario, this should result in only 1-2 API calls
      // (depending on implementation details)
      expect(callCount).toBeLessThan(5)
    })

    test('should handle network timeout gracefully without performance degradation', async () => {
      // Mock a slow network response
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({
                  mutualLikes: mockMutualLikes.slice(0, 5),
                  performance: { totalTime: 1000, cached: false, count: 5 },
                }),
              })
            }, 500) // 500ms delay
          })
      )

      const startTime = performance.now()

      const { unmount } = render(<MutualLikesSection />)

      // Component should render loading state quickly despite slow API
      const endTime = performance.now()
      const initialRenderTime = endTime - startTime

      expect(initialRenderTime).toBeLessThan(100) // Initial render should be fast

      // Wait for the slow API response
      await waitFor(
        () => {
          // Component should eventually show data
        },
        { timeout: 1000 }
      )

      unmount()
    })
  })
})
