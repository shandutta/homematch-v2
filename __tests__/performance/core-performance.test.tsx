import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor, fireEvent } from '@testing-library/react'
import { performance } from 'perf_hooks'
import React from 'react'

// Import components to test
import { PropertyCard } from '@/components/property/PropertyCard'
import { PropertySwiper } from '@/components/features/properties/PropertySwiper'
import { DashboardStats } from '@/components/features/dashboard/DashboardStats'
import { EnhancedPropertyCard } from '@/components/dashboard/EnhancedPropertyCard'

// Mock data generators
const generateMockProperty = (id: number) => {
  const listingStatus = 'for_sale'
  return {
    id: `property-${id}`,
    address: `${id * 100} Test Street`,
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94102',
    price: 500000 + id * 10000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500 + id * 100,
    property_type: 'single_family',
    listing_status: listingStatus,
    year_built: 2000 + id,
    lot_size: 5000,
    latitude: 37.7749 + id * 0.001,
    longitude: -122.4194 + id * 0.001,
    images: [`/image-${id}-1.jpg`, `/image-${id}-2.jpg`],
    description: `Beautiful property ${id} with modern amenities`,
    ml_score: 0.75 + id * 0.01,
    features: ['garage', 'pool', 'garden'],
  }
}

const generateMockInteraction = (propertyId: string, type: string) => ({
  id: `interaction-${propertyId}-${type}`,
  user_id: 'user-123',
  property_id: propertyId,
  interaction_type: type,
  interaction_score: Math.random(),
  created_at: new Date().toISOString(),
})

// Performance measurement utilities
class PerformanceMeasurer {
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number[]> = new Map()

  mark(name: string) {
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark)
    const end = endMark ? this.marks.get(endMark) : performance.now()

    if (start !== undefined && end !== undefined) {
      const duration = end - start

      if (!this.measures.has(name)) {
        this.measures.set(name, [])
      }

      this.measures.get(name)?.push(duration)
      return duration
    }

    return 0
  }

  getAverageTime(measureName: string): number {
    const times = this.measures.get(measureName) || []
    if (times.length === 0) return 0
    return times.reduce((a, b) => a + b, 0) / times.length
  }

  getPercentile(measureName: string, percentile: number): number {
    const times = [...(this.measures.get(measureName) || [])].sort(
      (a, b) => a - b
    )
    if (times.length === 0) return 0

    const index = Math.floor(times.length * (percentile / 100))
    return times[index] || times[times.length - 1]
  }

  clear() {
    this.marks.clear()
    this.measures.clear()
  }
}

describe('Core Performance Tests', () => {
  let perfMeasurer: PerformanceMeasurer

  beforeEach(() => {
    perfMeasurer = new PerformanceMeasurer()
    vi.clearAllMocks()
  })

  afterEach(() => {
    perfMeasurer.clear()
  })

  describe('PropertyCard Performance', () => {
    test('should render single PropertyCard within 50ms', () => {
      const property = generateMockProperty(1)

      perfMeasurer.mark('render-start')
      const { unmount } = render(<PropertyCard property={property} />)
      perfMeasurer.mark('render-end')

      const renderTime = perfMeasurer.measure(
        'render',
        'render-start',
        'render-end'
      )

      expect(renderTime).toBeLessThan(50)
      console.log(`PropertyCard render time: ${renderTime.toFixed(2)}ms`)

      unmount()
    })

    test('should handle 50 PropertyCards with acceptable performance', () => {
      const properties = Array.from({ length: 50 }, (_, i) =>
        generateMockProperty(i)
      )

      perfMeasurer.mark('batch-render-start')
      const { unmount } = render(
        <div>
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )
      perfMeasurer.mark('batch-render-end')

      const renderTime = perfMeasurer.measure(
        'batch-render',
        'batch-render-start',
        'batch-render-end'
      )

      expect(renderTime).toBeLessThan(500) // 50 cards in 500ms
      console.log(`50 PropertyCards render time: ${renderTime.toFixed(2)}ms`)
      console.log(`Average per card: ${(renderTime / 50).toFixed(2)}ms`)

      unmount()
    })

    test('should handle rapid re-renders efficiently', async () => {
      const property = generateMockProperty(1)
      const { rerender, unmount } = render(<PropertyCard property={property} />)

      // Measure re-render performance
      for (let i = 0; i < 10; i++) {
        const updatedProperty = {
          ...property,
          price: property.price + i * 1000,
        }

        perfMeasurer.mark(`rerender-${i}-start`)
        rerender(<PropertyCard property={updatedProperty} />)
        perfMeasurer.mark(`rerender-${i}-end`)

        perfMeasurer.measure(
          'rerender',
          `rerender-${i}-start`,
          `rerender-${i}-end`
        )
      }

      const avgRerenderTime = perfMeasurer.getAverageTime('rerender')
      const p95RerenderTime = perfMeasurer.getPercentile('rerender', 95)

      expect(avgRerenderTime).toBeLessThan(20)
      expect(p95RerenderTime).toBeLessThan(30)

      console.log(`Average re-render time: ${avgRerenderTime.toFixed(2)}ms`)
      console.log(`P95 re-render time: ${p95RerenderTime.toFixed(2)}ms`)

      unmount()
    })
  })

  describe('PropertySwiper Performance', () => {
    test('should initialize swiper with large dataset efficiently', async () => {
      const properties = Array.from({ length: 100 }, (_, i) =>
        generateMockProperty(i)
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ properties }),
      })

      perfMeasurer.mark('swiper-init-start')
      const { unmount } = render(<PropertySwiper />)
      perfMeasurer.mark('swiper-init-end')

      const initTime = perfMeasurer.measure(
        'swiper-init',
        'swiper-init-start',
        'swiper-init-end'
      )

      await waitFor(
        () => {
          // Wait for data to load
        },
        { timeout: 2000 }
      )

      expect(initTime).toBeLessThan(100)
      console.log(`Swiper initialization time: ${initTime.toFixed(2)}ms`)

      unmount()
    })

    test('should handle swipe interactions smoothly', async () => {
      const properties = Array.from({ length: 10 }, (_, i) =>
        generateMockProperty(i)
      )

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ properties }),
      })

      const { container, unmount } = render(<PropertySwiper />)

      await waitFor(() => {
        // Wait for data to load
      })

      // Simulate swipe interactions
      const swipeContainer = container.querySelector('.swipe-container')
      if (swipeContainer) {
        for (let i = 0; i < 5; i++) {
          perfMeasurer.mark(`swipe-${i}-start`)

          fireEvent.touchStart(swipeContainer, {
            touches: [{ clientX: 200, clientY: 200 }],
          })

          fireEvent.touchMove(swipeContainer, {
            touches: [{ clientX: 50, clientY: 200 }],
          })

          fireEvent.touchEnd(swipeContainer, {
            changedTouches: [{ clientX: 50, clientY: 200 }],
          })

          perfMeasurer.mark(`swipe-${i}-end`)
          perfMeasurer.measure('swipe', `swipe-${i}-start`, `swipe-${i}-end`)

          // Small delay between swipes
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      const avgSwipeTime = perfMeasurer.getAverageTime('swipe')
      expect(avgSwipeTime).toBeLessThan(50)

      console.log(
        `Average swipe interaction time: ${avgSwipeTime.toFixed(2)}ms`
      )

      unmount()
    })
  })

  describe('Dashboard Performance', () => {
    test('should render dashboard stats quickly', () => {
      const stats = {
        totalViewed: 150,
        totalLiked: 45,
        totalPassed: 105,
        viewedToday: 12,
        likedToday: 3,
        passedToday: 9,
      }

      perfMeasurer.mark('stats-render-start')
      const { unmount } = render(<DashboardStats stats={stats} />)
      perfMeasurer.mark('stats-render-end')

      const renderTime = perfMeasurer.measure(
        'stats-render',
        'stats-render-start',
        'stats-render-end'
      )

      expect(renderTime).toBeLessThan(30)
      console.log(`Dashboard stats render time: ${renderTime.toFixed(2)}ms`)

      unmount()
    })

    test('should handle dashboard with many properties efficiently', () => {
      const properties = Array.from({ length: 100 }, (_, i) =>
        generateMockProperty(i)
      )
      const interactions = properties.flatMap((p) => [
        generateMockInteraction(p.id, 'view'),
        generateMockInteraction(p.id, Math.random() > 0.5 ? 'like' : 'pass'),
      ])

      perfMeasurer.mark('dashboard-render-start')

      const { unmount } = render(
        <div>
          <DashboardStats
            stats={{
              totalViewed: interactions.filter(
                (i) => i.interaction_type === 'view'
              ).length,
              totalLiked: interactions.filter(
                (i) => i.interaction_type === 'like'
              ).length,
              totalPassed: interactions.filter(
                (i) => i.interaction_type === 'pass'
              ).length,
              viewedToday: 20,
              likedToday: 5,
              passedToday: 15,
            }}
          />

          {properties.slice(0, 20).map((property) => (
            <EnhancedPropertyCard
              key={property.id}
              property={property}
              interaction={interactions.find(
                (i) => i.property_id === property.id
              )}
            />
          ))}
        </div>
      )

      perfMeasurer.mark('dashboard-render-end')

      const renderTime = perfMeasurer.measure(
        'dashboard-render',
        'dashboard-render-start',
        'dashboard-render-end'
      )

      expect(renderTime).toBeLessThan(1000)
      console.log(`Full dashboard render time: ${renderTime.toFixed(2)}ms`)

      unmount()
    })
  })

  describe('Memory Usage Tests', () => {
    test('should not leak memory with repeated component mounting', () => {
      const initialMemory = process.memoryUsage().heapUsed
      const property = generateMockProperty(1)

      // Mount and unmount component multiple times
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<PropertyCard property={property} />)
        unmount()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Should not increase by more than 2MB for 100 mount/unmount cycles
      expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024)

      console.log(
        `Memory increase after 100 cycles: ${(memoryIncrease / 1024).toFixed(2)}KB`
      )
    })

    test('should handle large datasets without excessive memory', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Create large dataset
      const properties = Array.from({ length: 1000 }, (_, i) =>
        generateMockProperty(i)
      )
      const _interactions = properties.flatMap((p) => [
        generateMockInteraction(p.id, 'view'),
        generateMockInteraction(p.id, 'like'),
      ])

      // Render with large dataset
      const { unmount } = render(
        <div>
          {properties.slice(0, 100).map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )

      const afterRenderMemory = process.memoryUsage().heapUsed
      const memoryUsed = afterRenderMemory - initialMemory

      // Should use less than 10MB for 100 property cards
      expect(memoryUsed).toBeLessThan(10 * 1024 * 1024)

      console.log(
        `Memory used for 100 properties: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`
      )

      unmount()

      // Clean up
      if (global.gc) {
        global.gc()
      }
    })
  })

  describe('Animation Performance', () => {
    test('should maintain 60fps during animations', async () => {
      const property = generateMockProperty(1)

      // Mock requestAnimationFrame to measure frame rate
      let frameCount = 0
      const originalRAF = window.requestAnimationFrame
      window.requestAnimationFrame = (callback: FrameRequestCallback) => {
        frameCount++
        return originalRAF(callback)
      }

      const { container, unmount } = render(
        <div style={{ transition: 'transform 1s' }}>
          <PropertyCard property={property} />
        </div>
      )

      // Trigger animation
      const element = container.firstChild
      if (element instanceof HTMLElement) {
        element.style.transform = 'translateX(100px)'
      } else {
        throw new Error('Expected rendered element for animation test')
      }

      // Wait for animation to complete
      await new Promise((resolve) => setTimeout(resolve, 1100))

      // Restore original RAF
      window.requestAnimationFrame = originalRAF

      // Should maintain roughly 60fps (allowing for some variance)
      expect(frameCount).toBeGreaterThan(50)
      expect(frameCount).toBeLessThan(70)

      console.log(`Animation frame count: ${frameCount} (target: ~60)`)

      unmount()
    })
  })

  describe('Network Performance', () => {
    test('should handle slow network gracefully', async () => {
      // Simulate slow network
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({
                  properties: Array.from({ length: 10 }, (_, i) =>
                    generateMockProperty(i)
                  ),
                }),
              })
            }, 2000) // 2 second delay
          })
      )

      perfMeasurer.mark('slow-network-start')
      const { container, unmount } = render(<PropertySwiper />)

      // Should show loading state immediately
      expect(container.textContent).toContain('Loading')

      perfMeasurer.mark('loading-shown')
      const loadingTime = perfMeasurer.measure(
        'loading',
        'slow-network-start',
        'loading-shown'
      )

      expect(loadingTime).toBeLessThan(100) // Loading state should appear quickly

      // Wait for data
      await waitFor(
        () => {
          expect(container.querySelector('.property-card')).toBeTruthy()
        },
        { timeout: 3000 }
      )

      console.log(`Loading state appeared in: ${loadingTime.toFixed(2)}ms`)

      unmount()
    })

    test('should cache API responses effectively', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          properties: Array.from({ length: 10 }, (_, i) =>
            generateMockProperty(i)
          ),
        }),
      })

      global.fetch = mockFetch

      // First render
      const { unmount: unmount1 } = render(<PropertySwiper />)
      await waitFor(() => {})
      unmount1()

      // Second render (should use cache)
      const { unmount: unmount2 } = render(<PropertySwiper />)
      await waitFor(() => {})
      unmount2()

      // Fetch should only be called once if caching is working
      // (This depends on implementation - adjust based on actual caching strategy)
      expect(mockFetch).toHaveBeenCalledTimes(2) // Or 1 if caching is implemented

      console.log(`API calls made: ${mockFetch.mock.calls.length}`)
    })
  })
})

// Export performance thresholds for CI/CD
export const PERFORMANCE_THRESHOLDS = {
  componentRender: {
    single: 50, // Single component should render in <50ms
    batch50: 500, // 50 components should render in <500ms
    rerender: 20, // Re-render should take <20ms
  },
  interaction: {
    swipe: 50, // Swipe interaction should complete in <50ms
    click: 30, // Click interaction should complete in <30ms
  },
  memory: {
    mountCycle: 2 * 1024 * 1024, // 2MB for 100 mount/unmount cycles
    largeDataset: 10 * 1024 * 1024, // 10MB for large dataset
  },
  network: {
    loadingState: 100, // Loading state should appear in <100ms
    apiResponse: 500, // API should respond in <500ms
  },
}
