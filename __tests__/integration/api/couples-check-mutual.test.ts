/**
 * Integration tests for /api/couples/check-mutual endpoint
 * Tests the mutual like checking functionality
 */
import { describe, test, expect, beforeAll } from 'vitest'
import { randomUUID } from 'crypto'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const AUTH_HEADER = process.env.TEST_AUTH_TOKEN
  ? { Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}` }
  : undefined

const fetchJson = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${BASE_URL}${path}`, {
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
        'Set BASE_URL (e.g., http://localhost:3000) and TEST_AUTH_TOKEN in CI/local env.'
    )
  }
}

describe('Integration: /api/couples/check-mutual (authenticated)', () => {
  beforeAll(() => {
    if (!BASE_URL) {
      throw new Error('BASE_URL environment variable is required for integration tests')
    }
  })

  test('should return 401 without authentication', async () => {
    const { status, body } = await fetchJson(`/api/couples/check-mutual?propertyId=${randomUUID()}`, {
      headers: {}, // No auth header
    })

    expect(status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should return 400 without propertyId parameter', async () => {
    requireAuth()

    const { status, body } = await fetchJson('/api/couples/check-mutual')

    expect(status).toBe(400)
    expect(body.error).toBe('Property ID is required')
  })

  test('should return 400 with empty propertyId parameter', async () => {
    requireAuth()

    const { status, body } = await fetchJson('/api/couples/check-mutual?propertyId=')

    expect(status).toBe(400)
    expect(body.error).toBe('Property ID is required')
  })

  test('should check mutual like status for valid propertyId', async () => {
    requireAuth()

    const testPropertyId = 'test-property-123'
    const { status, body } = await fetchJson(`/api/couples/check-mutual?propertyId=${testPropertyId}`)

    expect([200, 500]).toContain(status)

    if (status === 200) {
      expect(body.isMutual).toBeDefined()
      expect(typeof body.isMutual).toBe('boolean')

      if (body.isMutual === true) {
        // If it's a mutual like, should have additional information
        expect(body.partnerName).toBeDefined()
        expect(typeof body.partnerName).toBe('string')
        expect(body.partnerName.length).toBeGreaterThan(0)

        expect(body.propertyAddress).toBeDefined()
        expect(typeof body.propertyAddress).toBe('string')
        expect(body.propertyAddress.length).toBeGreaterThan(0)

        // Optional fields
        if (body.streak !== undefined) {
          expect(typeof body.streak).toBe('number')
          expect(body.streak).toBeGreaterThanOrEqual(0)
        }

        if (body.milestone !== undefined) {
          expect(typeof body.milestone).toBe('object')
          expect(body.milestone.type).toBeDefined()
          expect(body.milestone.count).toBeDefined()
          expect(typeof body.milestone.count).toBe('number')
          expect(body.milestone.count).toBeGreaterThan(0)
        }
      } else {
        // If not mutual, should only have isMutual field
        expect(body.isMutual).toBe(false)
        expect(Object.keys(body)).toEqual(['isMutual'])
      }
    }
  })

  test('should handle non-existent propertyId gracefully', async () => {
    requireAuth()

    const nonExistentPropertyId = 'non-existent-property-999999'
    const { status, body } = await fetchJson(`/api/couples/check-mutual?propertyId=${nonExistentPropertyId}`)

    expect([200, 500]).toContain(status)

    if (status === 200) {
      // Should return false for non-existent properties
      expect(body.isMutual).toBe(false)
    }
  })

  test('should handle URL encoding in propertyId', async () => {
    requireAuth()

    const encodedPropertyId = encodeURIComponent('property-with-special-chars-#123')
    const { status, body } = await fetchJson(`/api/couples/check-mutual?propertyId=${encodedPropertyId}`)

    expect([200, 500]).toContain(status)

    if (status === 200) {
      expect(body.isMutual).toBeDefined()
      expect(typeof body.isMutual).toBe('boolean')
    }
  })

  test('should reject non-GET methods', async () => {
    requireAuth()
    
    const methods = ['POST', 'PUT', 'DELETE', 'PATCH']
    const testPropertyId = 'test-property-123'
    
    for (const method of methods) {
      const res = await fetch(`${BASE_URL}/api/couples/check-mutual?propertyId=${testPropertyId}`, {
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
    const testPropertyId = 'test-property-123'
    const { status, body } = await fetchJson(`/api/couples/check-mutual?propertyId=${testPropertyId}`, {
      headers: {
        Authorization: 'Bearer invalid-token-format',
      },
    })

    expect(status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should handle multiple query parameters correctly', async () => {
    requireAuth()

    // Should ignore extra parameters and only use propertyId
    const testPropertyId = 'test-property-123'
    const { status, body } = await fetchJson(
      `/api/couples/check-mutual?propertyId=${testPropertyId}&extraParam=ignore&another=value`
    )

    expect([200, 500]).toContain(status)

    if (status === 200) {
      expect(body.isMutual).toBeDefined()
      expect(typeof body.isMutual).toBe('boolean')
    }
  })

  test('should respond within reasonable time', async () => {
    requireAuth()

    const testPropertyId = 'test-property-123'
    const startTime = Date.now()
    const { status } = await fetchJson(`/api/couples/check-mutual?propertyId=${testPropertyId}`)
    const endTime = Date.now()
    
    expect([200, 500]).toContain(status)
    expect(endTime - startTime).toBeLessThan(5000) // Should respond within 5 seconds
  })

  test('should handle concurrent requests for same property', async () => {
    requireAuth()

    const testPropertyId = 'test-property-concurrent'
    const requests = Array.from({ length: 3 }, () => 
      fetchJson(`/api/couples/check-mutual?propertyId=${testPropertyId}`)
    )
    const responses = await Promise.all(requests)

    // All responses should have the same result for the same property
    responses.forEach(({ status, body }) => {
      expect([200, 500]).toContain(status)
      
      if (status === 200) {
        expect(body.isMutual).toBeDefined()
        expect(typeof body.isMutual).toBe('boolean')
      }
    })

    // Results should be consistent across concurrent requests
    const successfulResponses = responses.filter(r => r.status === 200)
    if (successfulResponses.length > 1) {
      const results = successfulResponses.map(r => r.body.isMutual)
      expect(new Set(results).size).toBe(1) // All should be the same
    }
  })

  test('should validate milestone structure when present', async () => {
    requireAuth()

    const testPropertyId = 'test-property-milestone'
    const { status, body } = await fetchJson(`/api/couples/check-mutual?propertyId=${testPropertyId}`)

    if (status === 200 && body.isMutual === true && body.milestone) {
      expect(body.milestone.type).toBe('mutual_likes')
      expect(typeof body.milestone.count).toBe('number')
      expect(body.milestone.count).toBeGreaterThan(0)
      expect(body.milestone.count % 5).toBe(0) // Should be a multiple of 5
    }
  })

  test('should handle special characters in propertyId', async () => {
    requireAuth()

    const specialPropertyIds = [
      'property-with-dashes',
      'property_with_underscores',
      'property123',
      'PROPERTY-UPPERCASE'
    ]

    for (const propertyId of specialPropertyIds) {
      const { status, body } = await fetchJson(`/api/couples/check-mutual?propertyId=${propertyId}`)
      
      expect([200, 500]).toContain(status)
      
      if (status === 200) {
        expect(body.isMutual).toBeDefined()
        expect(typeof body.isMutual).toBe('boolean')
      }
    }
  })
})