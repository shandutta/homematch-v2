/**
 * Integration tests for /api/couples/check-mutual endpoint
 * Tests the mutual like checking functionality
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { E2EHttpClient } from '../../utils/e2e-http-client'

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000'

describe('Integration: /api/couples/check-mutual (authenticated)', () => {
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
    const response = await client.get(
      `/api/couples/check-mutual?propertyId=test-property-123`,
      false // unauthenticated
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should return 400 without propertyId parameter', async () => {
    const response = await client.get('/api/couples/check-mutual')
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Property ID is required')
  })

  test('should return 400 with empty propertyId parameter', async () => {
    const response = await client.get('/api/couples/check-mutual?propertyId=')
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Property ID is required')
  })

  test('should check mutual like status for valid propertyId', async () => {
    const testPropertyId = 'test-property-123'
    const response = await client.get(
      `/api/couples/check-mutual?propertyId=${testPropertyId}`
    )
    const body = await response.json()

    // Server errors (500) should not be accepted - they indicate broken code
    expect(response.status).not.toBe(500)
    expect(response.status).toBe(200)

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
  })

  test('should handle non-existent propertyId gracefully', async () => {
    const nonExistentPropertyId = 'non-existent-property-999999'
    const response = await client.get(
      `/api/couples/check-mutual?propertyId=${nonExistentPropertyId}`
    )
    const body = await response.json()

    // Server errors should not be accepted
    expect(response.status).not.toBe(500)
    expect(response.status).toBe(200)
    // Should return false for non-existent properties
    expect(body.isMutual).toBe(false)
  })

  test('should handle URL encoding in propertyId', async () => {
    const encodedPropertyId = encodeURIComponent(
      'property-with-special-chars-#123'
    )
    const response = await client.get(
      `/api/couples/check-mutual?propertyId=${encodedPropertyId}`
    )
    const body = await response.json()

    // Server errors should not be accepted
    expect(response.status).not.toBe(500)
    expect(response.status).toBe(200)
    expect(body.isMutual).toBeDefined()
    expect(typeof body.isMutual).toBe('boolean')
  })

  test('should reject non-GET methods', async () => {
    const methods: Array<'POST' | 'PUT' | 'DELETE' | 'PATCH'> = [
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
    ]
    const testPropertyId = 'test-property-123'

    for (const method of methods) {
      const response = await client.request(
        `/api/couples/check-mutual?propertyId=${testPropertyId}`,
        { method }
      )

      expect(response.status).toBe(405)
    }
  })

  test('should handle malformed auth tokens', async () => {
    const testPropertyId = 'test-property-123'
    const response = await fetch(
      `${API_URL}/api/couples/check-mutual?propertyId=${testPropertyId}`,
      {
        headers: {
          Authorization: 'Bearer invalid-token-format',
          'content-type': 'application/json',
        },
      }
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should handle multiple query parameters correctly', async () => {
    // Should ignore extra parameters and only use propertyId
    const testPropertyId = 'test-property-123'
    const response = await client.get(
      `/api/couples/check-mutual?propertyId=${testPropertyId}&extraParam=ignore&another=value`
    )
    const body = await response.json()

    // Server errors should not be accepted
    expect(response.status).not.toBe(500)
    expect(response.status).toBe(200)
    expect(body.isMutual).toBeDefined()
    expect(typeof body.isMutual).toBe('boolean')
  })

  test('should respond within reasonable time', async () => {
    const testPropertyId = 'test-property-123'
    const startTime = Date.now()
    const response = await client.get(
      `/api/couples/check-mutual?propertyId=${testPropertyId}`
    )
    const endTime = Date.now()

    // Server errors should not be accepted - they indicate broken code
    expect(response.status).not.toBe(500)
    expect(response.status).toBe(200)
    expect(endTime - startTime).toBeLessThan(5000) // Should respond within 5 seconds
  })

  test('should handle concurrent requests for same property', async () => {
    const testPropertyId = 'test-property-concurrent'
    const requests = Array.from({ length: 3 }, () =>
      client.get(`/api/couples/check-mutual?propertyId=${testPropertyId}`)
    )
    const responses = await Promise.all(requests)

    // All responses should have the same result for the same property
    for (const response of responses) {
      const body = await response.json()
      // Server errors should not be accepted
      expect(response.status).not.toBe(500)
      expect(response.status).toBe(200)
      expect(body.isMutual).toBeDefined()
      expect(typeof body.isMutual).toBe('boolean')
    }
  })

  test('should validate milestone structure when present', async () => {
    const testPropertyId = 'test-property-milestone'
    const response = await client.get(
      `/api/couples/check-mutual?propertyId=${testPropertyId}`
    )
    const body = await response.json()

    if (response.status === 200 && body.isMutual === true && body.milestone) {
      expect(body.milestone.type).toBe('mutual_likes')
      expect(typeof body.milestone.count).toBe('number')
      expect(body.milestone.count).toBeGreaterThan(0)
      expect(body.milestone.count % 5).toBe(0) // Should be a multiple of 5
    }
  })

  test('should handle special characters in propertyId', async () => {
    const specialPropertyIds = [
      'property-with-dashes',
      'property_with_underscores',
      'property123',
      'PROPERTY-UPPERCASE',
    ]

    for (const propertyId of specialPropertyIds) {
      const response = await client.get(
        `/api/couples/check-mutual?propertyId=${propertyId}`
      )
      const body = await response.json()

      // Server errors should not be accepted
      expect(response.status).not.toBe(500)
      expect(response.status).toBe(200)
      expect(body.isMutual).toBeDefined()
      expect(typeof body.isMutual).toBe('boolean')
    }
  })
})
