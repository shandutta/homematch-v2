/**
 * Integration tests for /api/couples/stats endpoint
 * Tests the couples household statistics API functionality
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { E2EHttpClient } from '../../utils/e2e-http-client'

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000'

describe('Integration: /api/couples/stats (authenticated)', () => {
  let client: E2EHttpClient

  beforeAll(async () => {
    if (!API_URL) {
      throw new Error(
        'TEST_API_URL environment variable is required for integration tests'
      )
    }
    client = new E2EHttpClient(API_URL)
    await client.authenticateAs('test1@example.com', 'testpassword123')
  })

  afterAll(async () => {
    await client.cleanup()
  })

  test('should return 401 without authentication', async () => {
    const response = await client.get('/api/couples/stats', false) // unauthenticated
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should return household stats for authenticated user', async () => {
    const response = await client.get('/api/couples/stats')
    const body = await response.json()

    // Should succeed or return 404 if no household found
    expect([200, 404]).toContain(response.status)

    if (response.status === 200) {
      expect(body.stats).toBeDefined()
      expect(typeof body.stats).toBe('object')

      // Check that stats have expected structure
      const stats = body.stats

      // Optional numeric fields that should be non-negative if present
      const numericFields = [
        'total_mutual_likes',
        'activity_streak_days',
        'total_interactions',
        'properties_viewed',
        'properties_liked',
        'properties_passed',
      ]

      numericFields.forEach((field) => {
        if (stats[field] !== undefined && stats[field] !== null) {
          expect(typeof stats[field]).toBe('number')
          expect(stats[field]).toBeGreaterThanOrEqual(0)
        }
      })

      // Date fields should be valid ISO strings if present
      const dateFields = ['last_activity_at', 'created_at']
      dateFields.forEach((field) => {
        if (stats[field] !== undefined && stats[field] !== null) {
          expect(typeof stats[field]).toBe('string')
          expect(() => new Date(stats[field])).not.toThrow()
          expect(new Date(stats[field]).toISOString()).toBe(stats[field])
        }
      })
    } else if (response.status === 404) {
      expect(body.error).toContain('Household not found')
    }
  })

  test('should handle users without households gracefully', async () => {
    const response = await client.get('/api/couples/stats')
    const body = await response.json()

    if (response.status === 404) {
      expect(body.error).toBeDefined()
      expect(typeof body.error).toBe('string')
      expect(body.error).toContain('Household not found')
    }
  })

  test('should return consistent stats across multiple requests', async () => {
    const requests = Array.from({ length: 3 }, () =>
      client.get('/api/couples/stats')
    )
    const responses = await Promise.all(requests)

    // All responses should have the same status
    const statuses = responses.map((r) => r.status)
    expect(new Set(statuses).size).toBe(1) // All should be the same

    // If successful, stats should be consistent
    if (responses[0].status === 200) {
      const bodies = await Promise.all(responses.map((r) => r.json()))
      const statsArray = bodies.map((b) => b.stats)

      // Check that numeric stats are consistent (activity might increment, but core stats should be stable)
      const stableFields = [
        'total_mutual_likes',
        'properties_viewed',
        'properties_liked',
        'properties_passed',
      ]
      stableFields.forEach((field) => {
        const values = statsArray.map((stats) => stats[field])
        const uniqueValues = new Set(values)

        // Values should be consistent (allowing for some activity during test)
        expect(uniqueValues.size).toBeLessThanOrEqual(2)
      })
    }
  })

  test('should reject non-GET methods', async () => {
    const methods: Array<'POST' | 'PUT' | 'DELETE' | 'PATCH'> = [
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
    ]

    for (const method of methods) {
      const response = await client.request('/api/couples/stats', { method })

      expect(response.status).toBe(405)
    }
  })

  test('should handle malformed auth tokens', async () => {
    const response = await fetch(`${API_URL}/api/couples/stats`, {
      headers: {
        Authorization: 'Bearer invalid-token-format',
        'content-type': 'application/json',
      },
    })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should handle missing Authorization header scheme', async () => {
    const response = await fetch(`${API_URL}/api/couples/stats`, {
      headers: {
        Authorization: 'invalid-header-format',
        'content-type': 'application/json',
      },
    })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should include proper error handling for server errors', async () => {
    const response = await client.get('/api/couples/stats')
    const body = await response.json()

    // If server error occurs (500), should have proper error message
    if (response.status === 500) {
      expect(body.error).toBeDefined()
      expect(typeof body.error).toBe('string')
      expect(body.error).toBe('Failed to fetch household statistics')
    } else {
      // Should be a valid response
      expect([200, 404]).toContain(response.status)
    }
  })

  test('should respond within reasonable time', async () => {
    const startTime = Date.now()
    const response = await client.get('/api/couples/stats')
    const endTime = Date.now()

    // Server errors should not be accepted - they indicate broken code
    expect(response.status).not.toBe(500)
    expect([200, 404]).toContain(response.status)
    expect(endTime - startTime).toBeLessThan(5000) // Should respond within 5 seconds
  })

  test('should validate stats data types correctly', async () => {
    const response = await client.get('/api/couples/stats')
    const body = await response.json()

    if (response.status === 200) {
      const stats = body.stats

      // Validate specific data types for known fields
      if (stats.total_mutual_likes !== undefined) {
        expect(Number.isInteger(stats.total_mutual_likes)).toBe(true)
      }

      if (stats.activity_streak_days !== undefined) {
        expect(Number.isInteger(stats.activity_streak_days)).toBe(true)
      }

      if (stats.last_activity_at !== undefined) {
        const date = new Date(stats.last_activity_at)
        expect(date.getTime()).not.toBeNaN()
        expect(date.getTime()).toBeLessThanOrEqual(Date.now())
      }
    }
  })
})
