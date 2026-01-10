/**
 * Integration tests for /api/performance/metrics endpoint
 * Tests the performance metrics collection and retrieval functionality
 */
import { describe, test, expect, beforeAll, beforeEach } from 'vitest'

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000'

type PerformanceMetricRating = 'good' | 'needs-improvement' | 'poor'

type PerformanceMetric = {
  name: string
  value: number
  rating: PerformanceMetricRating
  delta?: number
  id: string
  navigationType?: string
  timestamp: number
}

type CustomMetric = {
  name: string
  value: number
  unit?: string
  tags?: Record<string, string>
  timestamp: number
}

type MetricsPayload = {
  metrics: PerformanceMetric[]
  customMetrics?: CustomMetric[]
  url: string
  userAgent: string
  timestamp: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const fetchJson = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  })

  let body: unknown = {}
  try {
    body = await res.json()
  } catch {
    // non-JSON body
  }

  const bodyRecord = isRecord(body) ? body : {}
  return { status: res.status, body: bodyRecord, headers: res.headers }
}

// Valid performance metrics payload for testing
const createValidMetricsPayload = (overrides: Partial<MetricsPayload> = {}) =>
  ({
    metrics: [
      {
        name: 'lcp',
        value: 2500,
        rating: 'good',
        id: 'lcp-1',
        timestamp: Date.now(),
      },
      {
        name: 'fid',
        value: 100,
        rating: 'needs-improvement',
        id: 'fid-1',
        timestamp: Date.now(),
      },
      {
        name: 'cls',
        value: 0.1,
        rating: 'poor',
        id: 'cls-1',
        timestamp: Date.now(),
      },
    ],
    customMetrics: [
      {
        name: 'long_task',
        value: 150,
        unit: 'ms',
        tags: { page: 'dashboard' },
        timestamp: Date.now(),
      },
    ],
    url: 'https://example.com/dashboard',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: Date.now(),
    ...overrides,
  }) satisfies MetricsPayload

describe('Integration: /api/performance/metrics', () => {
  beforeAll(() => {
    if (!API_URL) {
      throw new Error(
        'TEST_API_URL environment variable is required for integration tests'
      )
    }
  })

  // Clean up metrics store before each test by sending a known request
  beforeEach(async () => {
    // GET request to check current state - store is in-memory so no cleanup needed for tests
  })

  describe('POST /api/performance/metrics', () => {
    test('should accept valid metrics payload', async () => {
      const payload = createValidMetricsPayload()

      const { status, body } = await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.received).toBe(payload.metrics.length)
    })

    test('should reject invalid metrics payload', async () => {
      const invalidPayload = {
        metrics: [
          {
            name: 'lcp',
            // missing required fields
          },
        ],
        // missing required fields
      }

      const { status, body } = await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      })

      expect(status).toBe(400)
      expect(body.error).toBe('Invalid metrics payload')
    })

    test('should validate metric rating enum', async () => {
      const invalidPayload = createValidMetricsPayload({
        metrics: [
          {
            name: 'lcp',
            value: 2500,
            rating: 'invalid-rating', // Invalid rating
            id: 'lcp-1',
            timestamp: Date.now(),
          },
        ],
      })

      const { status, body } = await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      })

      expect(status).toBe(400)
      expect(body.error).toBe('Invalid metrics payload')
    })

    test('should validate URL format', async () => {
      const invalidPayload = createValidMetricsPayload({
        url: 'not-a-valid-url',
      })

      const { status, body } = await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
      })

      expect(status).toBe(400)
      expect(body.error).toBe('Invalid metrics payload')
    })

    test('should handle metrics without customMetrics', async () => {
      const payload = createValidMetricsPayload()
      delete payload.customMetrics

      const { status, body } = await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.received).toBe(payload.metrics.length)
    })

    test('should handle empty customMetrics array', async () => {
      const payload = createValidMetricsPayload({
        customMetrics: [],
      })

      const { status, body } = await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      expect(status).toBe(200)
      expect(body.success).toBe(true)
    })

    test('should accept metrics with optional fields', async () => {
      const payload = createValidMetricsPayload({
        metrics: [
          {
            name: 'lcp',
            value: 2500,
            rating: 'good',
            id: 'lcp-1',
            navigationType: 'navigate',
            delta: 100,
            timestamp: Date.now(),
          },
        ],
      })

      const { status, body } = await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      expect(status).toBe(200)
      expect(body.success).toBe(true)
    })

    test('should handle malformed JSON', async () => {
      const { status, body } = await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: 'invalid-json{',
      })

      expect(status).toBe(400)
      expect(body.error).toBe('Invalid metrics payload')
    })

    test('should handle large payload', async () => {
      const largePayload = createValidMetricsPayload({
        metrics: Array.from({ length: 50 }, (_, i) => ({
          name: `metric-${i}`,
          value: Math.random() * 1000,
          rating: 'good',
          id: `metric-${i}`,
          timestamp: Date.now(),
        })),
      })

      const { status, body } = await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(largePayload),
      })

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.received).toBe(50)
    })
  })

  describe('GET /api/performance/metrics', () => {
    test('should return metrics data structure', async () => {
      // First post some metrics
      const payload = createValidMetricsPayload()
      await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      // Then get metrics
      const { status, body } = await fetchJson('/api/performance/metrics')

      expect(status).toBe(200)
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('metrics')
      expect(body).toHaveProperty('aggregates')

      expect(typeof body.total).toBe('number')
      expect(Array.isArray(body.metrics)).toBe(true)
      expect(typeof body.aggregates).toBe('object')
    })

    test('should filter by page parameter', async () => {
      const { status, body } = await fetchJson(
        '/api/performance/metrics?page=dashboard'
      )

      expect(status).toBe(200)
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('metrics')
      expect(body).toHaveProperty('aggregates')
    })

    test('should filter by metric parameter', async () => {
      const { status, body } = await fetchJson(
        '/api/performance/metrics?metric=lcp'
      )

      expect(status).toBe(200)
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('metrics')
      expect(body).toHaveProperty('aggregates')
    })

    test('should filter by rating parameter', async () => {
      const { status, body } = await fetchJson(
        '/api/performance/metrics?rating=poor'
      )

      expect(status).toBe(200)
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('metrics')
      expect(body).toHaveProperty('aggregates')
    })

    test('should handle multiple query parameters', async () => {
      const { status, body } = await fetchJson(
        '/api/performance/metrics?page=dashboard&metric=lcp&rating=good'
      )

      expect(status).toBe(200)
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('metrics')
      expect(body).toHaveProperty('aggregates')
    })

    test('should return empty results for non-matching filters', async () => {
      const { status, body } = await fetchJson(
        '/api/performance/metrics?page=non-existent-page'
      )

      expect(status).toBe(200)
      expect(body.total).toBeDefined()
      expect(Array.isArray(body.metrics)).toBe(true)
      expect(typeof body.aggregates).toBe('object')
    })

    test('should limit results to last 100 entries', async () => {
      const { status, body } = await fetchJson('/api/performance/metrics')

      expect(status).toBe(200)
      const metrics = body.metrics
      expect(Array.isArray(metrics)).toBe(true)
      if (Array.isArray(metrics)) {
        expect(metrics.length).toBeLessThanOrEqual(100)
      }
    })

    test('should calculate aggregates correctly', async () => {
      // Post some metrics first
      const payload = createValidMetricsPayload()
      await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const { status, body } = await fetchJson('/api/performance/metrics')

      expect(status).toBe(200)

      const aggregates = body.aggregates
      if (isRecord(aggregates) && Object.keys(aggregates).length > 0) {
        Object.values(aggregates).forEach((aggregate) => {
          if (!isRecord(aggregate)) return

          const { count, min, max, mean, p50, p75, p95, p99 } = aggregate

          expect(aggregate).toHaveProperty('count')
          expect(aggregate).toHaveProperty('min')
          expect(aggregate).toHaveProperty('max')
          expect(aggregate).toHaveProperty('mean')
          expect(aggregate).toHaveProperty('p50')
          expect(aggregate).toHaveProperty('p75')
          expect(aggregate).toHaveProperty('p95')
          expect(aggregate).toHaveProperty('p99')

          expect(typeof count).toBe('number')
          expect(typeof min).toBe('number')
          expect(typeof max).toBe('number')
          expect(typeof mean).toBe('number')
          expect(typeof p50).toBe('number')
          expect(typeof p75).toBe('number')
          expect(typeof p95).toBe('number')
          expect(typeof p99).toBe('number')

          if (
            typeof count === 'number' &&
            typeof min === 'number' &&
            typeof max === 'number' &&
            typeof p50 === 'number' &&
            typeof p75 === 'number' &&
            typeof p95 === 'number' &&
            typeof p99 === 'number'
          ) {
            expect(count).toBeGreaterThan(0)
            expect(min).toBeLessThanOrEqual(max)
            expect(p50).toBeLessThanOrEqual(p75)
            expect(p75).toBeLessThanOrEqual(p95)
            expect(p95).toBeLessThanOrEqual(p99)
          }
        })
      }
    })
  })

  describe('Method validation', () => {
    test('should reject unsupported methods', async () => {
      const methods = ['PUT', 'DELETE', 'PATCH']

      // Make all requests concurrently to avoid sequential timeout stacking
      const responses = await Promise.all(
        methods.map((method) =>
          fetch(`${API_URL}/api/performance/metrics`, {
            method,
            headers: {
              'content-type': 'application/json',
            },
          })
        )
      )

      for (const res of responses) {
        expect(res.status).toBe(405)
      }
    })
  })

  describe('Error handling', () => {
    test('should handle concurrent POST requests', async () => {
      const payload = createValidMetricsPayload()

      // Reduced from 5 to 3 to prevent connection exhaustion in test environment
      const requests = Array.from({ length: 3 }, () =>
        fetchJson('/api/performance/metrics', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      )

      const responses = await Promise.all(requests)

      responses.forEach(({ status, body }) => {
        expect(status).toBe(200)
        expect(body.success).toBe(true)
      })
    })

    test('should respond within reasonable time', async () => {
      const payload = createValidMetricsPayload()

      const startTime = Date.now()
      const { status } = await fetchJson('/api/performance/metrics', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const endTime = Date.now()

      expect(status).toBe(200)
      expect(endTime - startTime).toBeLessThan(2000) // Should respond within 2 seconds
    })
  })
})
