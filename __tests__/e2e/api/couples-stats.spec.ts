/**
 * Integration tests for /api/couples/stats endpoint
 * Tests the couples household statistics API functionality
 */
import { describe, test, expect, beforeAll } from 'vitest'

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000'
const AUTH_HEADER = process.env.TEST_AUTH_TOKEN
  ? { Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}` }
  : undefined

const fetchJson = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      ...(AUTH_HEADER || {}),
      ...(init?.headers || {}),
    },
    ...init,
  })
  
  let body: any = {}
  try {
    body = await res.json()
  } catch {
    // non-JSON body
  }
  
  return { status: res.status, body, headers: res.headers }
}

const requireAuth = () => {
  if (!AUTH_HEADER) {
    throw new Error(
      'TEST_AUTH_TOKEN env var is required for authenticated integration tests. ' +
        'Set TEST_API_URL (e.g., http://localhost:3000) and TEST_AUTH_TOKEN in CI/local env.'
    )
  }
}

describe('Integration: /api/couples/stats (authenticated)', () => {
  beforeAll(() => {
    if (!API_URL) {
      throw new Error('TEST_API_URL environment variable is required for integration tests')
    }
  })

  test('should return 401 without authentication', async () => {
    const { status, body } = await fetchJson('/api/couples/stats', {
      headers: {}, // No auth header
    })

    expect(status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should return household stats for authenticated user', async () => {
    requireAuth()

    const { status, body } = await fetchJson('/api/couples/stats')

    // Should succeed or return 404 if no household found
    expect([200, 404]).toContain(status)

    if (status === 200) {
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
        'properties_passed'
      ]
      
      numericFields.forEach(field => {
        if (stats[field] !== undefined && stats[field] !== null) {
          expect(typeof stats[field]).toBe('number')
          expect(stats[field]).toBeGreaterThanOrEqual(0)
        }
      })

      // Date fields should be valid ISO strings if present
      const dateFields = ['last_activity_at', 'created_at']
      dateFields.forEach(field => {
        if (stats[field] !== undefined && stats[field] !== null) {
          expect(typeof stats[field]).toBe('string')
          expect(() => new Date(stats[field])).not.toThrow()
          expect(new Date(stats[field]).toISOString()).toBe(stats[field])
        }
      })
    } else if (status === 404) {
      expect(body.error).toContain('Household not found')
    }
  })

  test('should handle users without households gracefully', async () => {
    requireAuth()

    const { status, body } = await fetchJson('/api/couples/stats')

    if (status === 404) {
      expect(body.error).toBeDefined()
      expect(typeof body.error).toBe('string')
      expect(body.error).toContain('Household not found')
    }
  })

  test('should return consistent stats across multiple requests', async () => {
    requireAuth()

    const requests = Array.from({ length: 3 }, () => 
      fetchJson('/api/couples/stats')
    )
    const responses = await Promise.all(requests)

    // All responses should have the same status
    const statuses = responses.map(r => r.status)
    expect(new Set(statuses).size).toBe(1) // All should be the same

    // If successful, stats should be consistent
    if (responses[0].status === 200) {
      const statsArray = responses.map(r => r.body.stats)
      
      // Check that numeric stats are consistent (activity might increment, but core stats should be stable)
      const stableFields = ['total_mutual_likes', 'properties_viewed', 'properties_liked', 'properties_passed']
      stableFields.forEach(field => {
        const values = statsArray.map(stats => stats[field])
        const uniqueValues = new Set(values)
        
        // Values should be consistent (allowing for some activity during test)
        expect(uniqueValues.size).toBeLessThanOrEqual(2)
      })
    }
  })

  test('should reject non-GET methods', async () => {
    requireAuth()
    
    const methods = ['POST', 'PUT', 'DELETE', 'PATCH']
    
    for (const method of methods) {
      const res = await fetch(`${API_URL}/api/couples/stats`, {
        method,
        headers: {
          'content-type': 'application/json',
          ...AUTH_HEADER,
        },
      })
      
      expect(res.status).toBe(405)
    }
  })

  test('should handle malformed auth tokens', async () => {
    const { status, body } = await fetchJson('/api/couples/stats', {
      headers: {
        Authorization: 'Bearer invalid-token-format',
      },
    })

    expect(status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should handle missing Authorization header scheme', async () => {
    const { status, body } = await fetchJson('/api/couples/stats', {
      headers: {
        Authorization: 'invalid-header-format',
      },
    })

    expect(status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should include proper error handling for server errors', async () => {
    requireAuth()

    const { status, body } = await fetchJson('/api/couples/stats')

    // If server error occurs (500), should have proper error message
    if (status === 500) {
      expect(body.error).toBeDefined()
      expect(typeof body.error).toBe('string')
      expect(body.error).toBe('Failed to fetch household statistics')
    } else {
      // Should be a valid response
      expect([200, 404]).toContain(status)
    }
  })

  test('should respond within reasonable time', async () => {
    requireAuth()

    const startTime = Date.now()
    const { status } = await fetchJson('/api/couples/stats')
    const endTime = Date.now()
    
    expect([200, 404, 500]).toContain(status)
    expect(endTime - startTime).toBeLessThan(5000) // Should respond within 5 seconds
  })

  test('should validate stats data types correctly', async () => {
    requireAuth()

    const { status, body } = await fetchJson('/api/couples/stats')

    if (status === 200) {
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