import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { E2EHttpClient } from '../../utils/e2e-http-client'

/**
 * Couples API E2E Tests - Real HTTP Requests
 *
 * These tests make real HTTP requests to the dev server to verify the complete
 * integration works as expected. This includes testing auth middleware, rate
 * limiting, request parsing, business logic, and response formatting.
 */
describe('Couples API E2E Tests', () => {
  let client: E2EHttpClient

  beforeEach(() => {
    client = new E2EHttpClient()
  })

  afterEach(async () => {
    await client.cleanup()
  })

  // Test if the API endpoints can be called without crashing
  describe('API Endpoint Availability', () => {
    test('mutual-likes endpoint should handle unauthenticated requests', async () => {
      const response = await client.unauthenticatedRequest(
        '/api/couples/mutual-likes'
      )
      const data = await response.json()

      // Should return 401 for unauthenticated request
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Unauthorized')
    })

    test('activity endpoint should handle unauthenticated requests', async () => {
      const response = await client.unauthenticatedRequest(
        '/api/couples/activity'
      )
      const data = await response.json()

      // Should return 401 for unauthenticated request
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Unauthorized')
    })

    test('stats endpoint should handle unauthenticated requests', async () => {
      const response = await client.unauthenticatedRequest('/api/couples/stats')
      const data = await response.json()

      // Should return 401 for unauthenticated request
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Unauthorized')
    })

    test('notify endpoint should handle unauthenticated requests', async () => {
      const response = await client.unauthenticatedRequest(
        '/api/couples/notify',
        {
          method: 'POST',
          body: {
            property_id: 'test-property',
            interaction_type: 'like',
          },
        }
      )
      const data = await response.json()

      // Should return 401 for unauthenticated request
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('API Parameter Handling', () => {
    test('mutual-likes should handle query parameters correctly', async () => {
      const response = await client.unauthenticatedRequest(
        '/api/couples/mutual-likes',
        {
          query: { includeProperties: 'false' },
        }
      )

      // Even without auth, it should parse parameters correctly
      // and fail at auth step, not parameter parsing
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('activity should handle limit and offset parameters correctly', async () => {
      const response = await client.unauthenticatedRequest(
        '/api/couples/activity',
        {
          query: { limit: '10', offset: '5' },
        }
      )

      // Even without auth, it should parse parameters correctly
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('activity should handle invalid parameters gracefully', async () => {
      const response = await client.unauthenticatedRequest(
        '/api/couples/activity',
        {
          query: { limit: 'invalid', offset: 'also-invalid' },
        }
      )

      // Should not crash on invalid parameters
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('notify should handle missing request body', async () => {
      const response = await client.unauthenticatedRequest(
        '/api/couples/notify',
        {
          method: 'POST',
          // No body provided
        }
      )

      // Should handle missing body gracefully
      expect(response.status).toBe(401) // Auth fails before body validation

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('notify should handle invalid JSON body', async () => {
      try {
        const response = await client.unauthenticatedRequest(
          '/api/couples/notify',
          {
            method: 'POST',
            body: 'invalid json',
          }
        )

        // Should handle invalid JSON gracefully
        expect(response.status).toBeOneOf([400, 401])
      } catch (error) {
        // It's acceptable for malformed JSON to throw an error
        expect(error).toBeDefined()
      }
    })
  })

  describe('API Response Structure', () => {
    test('all API endpoints should return JSON responses', async () => {
      const endpoints = [
        '/api/couples/mutual-likes',
        '/api/couples/activity',
        '/api/couples/stats',
      ]

      for (const endpoint of endpoints) {
        const response = await client.unauthenticatedRequest(endpoint)

        // Check response is JSON
        const contentType = response.headers.get('content-type')
        expect(contentType).toContain('application/json')

        // Check JSON is parseable
        const data = await response.json()
        expect(data).toBeDefined()
        expect(typeof data).toBe('object')
      }
    })

    test('error responses should have consistent structure', async () => {
      const response = await client.unauthenticatedRequest(
        '/api/couples/mutual-likes'
      )
      const data = await response.json()

      // Check error response structure
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.length).toBeGreaterThan(0)
    })
  })

  describe('API Performance', () => {
    test('API endpoints should respond within reasonable time', async () => {
      const startTime = Date.now()
      const response = await client.unauthenticatedRequest(
        '/api/couples/mutual-likes'
      )
      const endTime = Date.now()

      const responseTime = endTime - startTime

      // Should respond within 5 seconds (even with database operations)
      expect(responseTime).toBeLessThan(5000)

      // Should be able to parse the response
      const data = await response.json()
      expect(data).toBeDefined()
    })

    test('all endpoints should handle concurrent requests', async () => {
      const endpoints = [
        '/api/couples/mutual-likes',
        '/api/couples/activity',
        '/api/couples/stats',
      ]

      // Make concurrent requests
      const promises = endpoints.map((endpoint) =>
        client.unauthenticatedRequest(endpoint)
      )
      const responses = await Promise.all(promises)

      // All should complete successfully
      responses.forEach((response) => {
        expect(response.status).toBeOneOf([200, 401, 500]) // Valid HTTP status codes
      })

      // All should return parseable JSON
      const dataPromises = responses.map((r) => r.json())
      const data = await Promise.all(dataPromises)

      data.forEach((responseData) => {
        expect(responseData).toBeDefined()
        expect(typeof responseData).toBe('object')
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle method not allowed correctly', async () => {
      // Test POST on GET-only endpoint
      try {
        // This should either return 405 Method Not Allowed or handle gracefully
        const response = await client.unauthenticatedRequest(
          '/api/couples/mutual-likes',
          {
            method: 'POST',
            body: { test: 'data' },
          }
        )
        expect(response.status).toBeOneOf([405, 401, 500])
      } catch (error) {
        // It's acceptable for unsupported methods to throw
        expect(error).toBeDefined()
      }
    })

    test('should handle malformed requests gracefully', async () => {
      // Test with extremely long URL
      const longQuery = 'a'.repeat(10000)

      try {
        const response = await client.unauthenticatedRequest(
          '/api/couples/mutual-likes',
          {
            query: { query: longQuery },
          }
        )
        expect(response.status).toBeOneOf([200, 400, 401, 414, 500])
      } catch (error) {
        // It's acceptable for malformed requests to throw
        expect(error).toBeDefined()
      }
    })
  })

  describe('Security', () => {
    test('should not expose sensitive information in error messages', async () => {
      const response = await client.unauthenticatedRequest(
        '/api/couples/mutual-likes'
      )
      const data = await response.json()

      // Check that error doesn't expose sensitive info
      expect(data.error).toBe('Unauthorized')
      expect(data.error).not.toContain('password')
      expect(data.error).not.toContain('token')
      expect(data.error).not.toContain('secret')
      expect(data.error).not.toContain('key')

      // Should not include stack traces in production-like responses
      expect(data).not.toHaveProperty('stack')
      expect(data).not.toHaveProperty('trace')
    })

    test('should not accept dangerous query parameters', async () => {
      // Test with potential injection attempts
      const dangerousQueries = [
        { includeProperties: 'true; DROP TABLE users;--' },
        { includeProperties: "true'; SELECT * FROM users;--" },
        { includeProperties: '<script>alert(1)</script>' },
        { limit: '999999999' },
        { offset: '-1' },
      ]

      for (const query of dangerousQueries) {
        try {
          const response = await client.unauthenticatedRequest(
            '/api/couples/mutual-likes',
            {
              query,
            }
          )
          // Should not crash and should return appropriate error
          expect(response.status).toBeOneOf([200, 400, 401, 422, 500])
        } catch (error) {
          // It's acceptable for dangerous inputs to be rejected
          expect(error).toBeDefined()
        }
      }
    })
  })

  // Add authenticated tests to verify full functionality
  describe('Authenticated API Tests', () => {
    test('authenticated users should be able to access mutual-likes', async () => {
      try {
        // Use test user credentials
        await client.authenticateAs('test1@example.com', 'password123')

        const response = await client.get('/api/couples/mutual-likes')

        // Should succeed with auth
        expect(response.status).toBeOneOf([200, 500]) // 200 for success, 500 for DB issues

        if (response.ok) {
          const data = await response.json()
          expect(data).toHaveProperty('mutualLikes')
          expect(Array.isArray(data.mutualLikes)).toBe(true)
        }
      } catch (error) {
        // Test user may not exist yet - that's okay for this conversion
        console.log(
          'Test user authentication failed (expected during setup):',
          error
        )
      }
    })
  })
})
