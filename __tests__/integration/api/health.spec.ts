/**
 * E2E tests for /api/health endpoint
 * Tests the health check functionality including database connectivity using real HTTP requests
 */

import { E2EHttpClient } from '../../utils/e2e-http-client'

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000'

describe('E2E: /api/health', () => {
  let client: E2EHttpClient

  beforeEach(() => {
    client = new E2EHttpClient(API_URL)
  })

  afterEach(async () => {
    await client.cleanup()
  })

  test('should return health status with proper structure', async () => {
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
  })

  test('should include database connectivity information', async () => {
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
  })

  test('should return 200 when database is connected', async () => {
    const response = await client.get('/api/health')
    const body = await response.json()

    if (body.database === 'connected') {
      expect(response.status).toBe(200)
      expect(body.status).toBe('healthy')
      expect(body.database_error).toBeUndefined()
    }
  })

  test('should return 503 when database has issues', async () => {
    const response = await client.get('/api/health')
    const body = await response.json()

    if (body.database === 'error') {
      expect(response.status).toBe(503)
      expect(body.status).toBe('healthy') // Service itself is healthy, just DB connection issue
      expect(body.database_error).toBeDefined()
    }
  })

  test('should handle multiple concurrent requests', async () => {
    // Test that health endpoint can handle concurrent requests
    const requests = Array.from({ length: 5 }, () => client.get('/api/health'))
    const responses = await Promise.all(requests)

    for (const response of responses) {
      const body = await response.json()
      expect([200, 503]).toContain(response.status)
      expect(body.service).toBe('HomeMatch V2')
      expect(body.version).toBe('2.0.0')
    }
  })

  test('should have consistent response structure across calls', async () => {
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
  })

  test('should handle OPTIONS request for CORS', async () => {
    const response = await client.request('/api/health', { method: 'OPTIONS' })

    // OPTIONS should be handled properly (204 for CORS preflight, or 200/405)
    expect([200, 204, 405]).toContain(response.status)
  })

  test('should reject non-GET methods appropriately', async () => {
    const methods = ['POST', 'PUT', 'DELETE', 'PATCH'] as const

    for (const method of methods) {
      const response = await client.request('/api/health', { method })

      // Should return 405 Method Not Allowed
      expect(response.status).toBe(405)
    }
  })
})
