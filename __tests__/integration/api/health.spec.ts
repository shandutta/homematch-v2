/**
 * E2E tests for /api/health endpoint
 * Tests the health check functionality including database connectivity using real HTTP requests
 */

import { E2EHttpClient } from '../../utils/e2e-http-client'

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000'

// Increase timeout for integration tests making real HTTP requests
const TEST_TIMEOUT = 60000 // 60s per test

describe('E2E: /api/health', () => {
  let client: E2EHttpClient

  // Use beforeEach to create fresh client per test, preventing connection
  // exhaustion when tests share a single client instance.
  // Health tests don't authenticate, so no cleanup/afterEach is needed.
  beforeEach(() => {
    client = new E2EHttpClient(API_URL)
  })

  test(
    'should return health status with proper structure',
    async () => {
      const response = await client.get('/api/health')
      const body = await response.json()

      // Should return either 200 (healthy) or 503 (unhealthy)
      expect([200, 503]).toContain(response.status)

      // Check response headers
      expect(response.headers.get('content-type')).toContain('application/json')
      expect(response.headers.get('cache-control')).toBe(
        'no-cache, no-store, must-revalidate'
      )

      // Check response structure
      expect(body).toBeDefined()
      expect(typeof body).toBe('object')
      expect(body.status).toBeDefined()
      expect(body.timestamp).toBeDefined()
      expect(body.service).toBe('HomeMatch V2')
      expect(body.version).toBe('2.0.0')

      // Timestamp should be valid ISO date
      expect(() => new Date(body.timestamp)).not.toThrow()
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
    },
    TEST_TIMEOUT
  )

  test(
    'should include database connectivity information',
    async () => {
      const response = await client.get('/api/health')
      const body = await response.json()

      // Should have database status
      expect(body.database).toBeDefined()
      expect(['connected', 'error']).toContain(body.database)

      // If database is in error state, should have error message
      if (body.database === 'error') {
        expect(body.database_error).toBeDefined()
        expect(typeof body.database_error).toBe('string')
        expect(body.database_error.length).toBeGreaterThan(0)
      }
    },
    TEST_TIMEOUT
  )

  test(
    'should return 200 when database is connected',
    async () => {
      const response = await client.get('/api/health')
      const body = await response.json()

      if (body.database === 'connected') {
        expect(response.status).toBe(200)
        expect(body.status).toBe('healthy')
        expect(body.database_error).toBeUndefined()
      }
    },
    TEST_TIMEOUT
  )

  test(
    'should return 503 when database has issues',
    async () => {
      const response = await client.get('/api/health')
      const body = await response.json()

      if (body.database === 'error') {
        expect(response.status).toBe(503)
        expect(body.status).toBe('healthy') // Service itself is healthy, just DB connection issue
        expect(body.database_error).toBeDefined()
      }
    },
    TEST_TIMEOUT
  )

  test(
    'should handle multiple concurrent requests',
    async () => {
      // Test that health endpoint can handle concurrent requests
      // Reduced from 5 to 3 to prevent connection exhaustion in test environment
      const requests = Array.from({ length: 3 }, () =>
        client.get('/api/health')
      )
      const responses = await Promise.all(requests)

      for (const response of responses) {
        const body = await response.json()
        expect([200, 503]).toContain(response.status)
        expect(body.service).toBe('HomeMatch V2')
        expect(body.version).toBe('2.0.0')
      }
    },
    TEST_TIMEOUT
  )

  test(
    'should have consistent response structure across calls',
    async () => {
      const response1 = await client.get('/api/health')
      const response2 = await client.get('/api/health')
      const body1 = await response1.json()
      const body2 = await response2.json()

      // Both responses should have the same structure
      const keys1 = Object.keys(body1).sort()
      const keys2 = Object.keys(body2).sort()

      expect(keys1).toEqual(keys2)

      // Static fields should be the same
      expect(body1.service).toBe(body2.service)
      expect(body1.version).toBe(body2.version)
    },
    TEST_TIMEOUT
  )

  test(
    'should handle OPTIONS request for CORS',
    async () => {
      const response = await client.request('/api/health', {
        method: 'OPTIONS',
      })

      // Next.js returns 405 for unhandled methods when no explicit OPTIONS export
      expect(response.status).toBe(405)
    },
    TEST_TIMEOUT
  )

  test(
    'should reject non-GET methods appropriately',
    async () => {
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'] as const

      // Make all requests concurrently to avoid sequential timeout stacking
      const responses = await Promise.all(
        methods.map((method) => client.request('/api/health', { method }))
      )

      // All should return 405 Method Not Allowed
      for (const response of responses) {
        expect(response.status).toBe(405)
      }
    },
    TEST_TIMEOUT
  )
})
