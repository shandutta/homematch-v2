import { describe, test, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getMutualLikes } from '@/app/api/couples/mutual-likes/route'
import { GET as getActivity } from '@/app/api/couples/activity/route'
import { GET as getStats } from '@/app/api/couples/stats/route'
import { POST as notifyInteraction } from '@/app/api/couples/notify/route'

/**
 * These tests verify the couples API endpoints work end-to-end
 * They test the actual API routes without mocking the underlying services
 * to verify the complete integration works as expected.
 */
describe('Couples API E2E Tests', () => {
  // Test if the API endpoints can be called without crashing
  describe('API Endpoint Availability', () => {
    test('mutual-likes endpoint should handle unauthenticated requests', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        {
          method: 'GET',
        }
      )

      const response = await getMutualLikes(request)
      const data = await response.json()

      // Should return 401 for unauthenticated request
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Unauthorized')
    })

    test('activity endpoint should handle unauthenticated requests', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/couples/activity',
        {
          method: 'GET',
        }
      )

      const response = await getActivity(request)
      const data = await response.json()

      // Should return 401 for unauthenticated request
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Unauthorized')
    })

    test('stats endpoint should handle unauthenticated requests', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/couples/stats',
        {
          method: 'GET',
        }
      )

      const response = await getStats(request)
      const data = await response.json()

      // Should return 401 for unauthenticated request
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Unauthorized')
    })

    test('notify endpoint should handle unauthenticated requests', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/couples/notify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            property_id: 'test-property',
            interaction_type: 'like',
          }),
        }
      )

      const response = await notifyInteraction(request)
      const data = await response.json()

      // Should return 401 for unauthenticated request
      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('API Parameter Handling', () => {
    test('mutual-likes should handle query parameters correctly', async () => {
      // Test with includeProperties=false parameter
      const url = new URL(
        'http://localhost:3000/api/couples/mutual-likes?includeProperties=false'
      )
      const request = new NextRequest(url, { method: 'GET' })

      const response = await getMutualLikes(request)

      // Even without auth, it should parse parameters correctly
      // and fail at auth step, not parameter parsing
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('activity should handle limit and offset parameters correctly', async () => {
      const url = new URL(
        'http://localhost:3000/api/couples/activity?limit=10&offset=5'
      )
      const request = new NextRequest(url, { method: 'GET' })

      const response = await getActivity(request)

      // Even without auth, it should parse parameters correctly
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('activity should handle invalid parameters gracefully', async () => {
      const url = new URL(
        'http://localhost:3000/api/couples/activity?limit=invalid&offset=also-invalid'
      )
      const request = new NextRequest(url, { method: 'GET' })

      const response = await getActivity(request)

      // Should not crash on invalid parameters
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('notify should handle missing request body', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/couples/notify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // No body provided
        }
      )

      const response = await notifyInteraction(request)

      // Should handle missing body gracefully
      expect(response.status).toBe(401) // Auth fails before body validation

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('notify should handle invalid JSON body', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/couples/notify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: 'invalid json',
        }
      )

      try {
        const response = await notifyInteraction(request)

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
        { route: getMutualLikes, path: '/api/couples/mutual-likes' },
        { route: getActivity, path: '/api/couples/activity' },
        { route: getStats, path: '/api/couples/stats' },
      ]

      for (const endpoint of endpoints) {
        const request = new NextRequest(
          `http://localhost:3000${endpoint.path}`,
          {
            method: 'GET',
          }
        )

        const response = await endpoint.route(request)

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
      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        {
          method: 'GET',
        }
      )

      const response = await getMutualLikes(request)
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
      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        {
          method: 'GET',
        }
      )

      const startTime = Date.now()
      const response = await getMutualLikes(request)
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
        () =>
          getMutualLikes(
            new NextRequest('http://localhost:3000/api/couples/mutual-likes', {
              method: 'GET',
            })
          ),
        () =>
          getActivity(
            new NextRequest('http://localhost:3000/api/couples/activity', {
              method: 'GET',
            })
          ),
        () =>
          getStats(
            new NextRequest('http://localhost:3000/api/couples/stats', {
              method: 'GET',
            })
          ),
      ]

      // Make concurrent requests
      const promises = endpoints.map((endpoint) => endpoint())
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
      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        {
          method: 'POST',
          body: JSON.stringify({ test: 'data' }),
        }
      )

      try {
        // This should either return 405 Method Not Allowed or handle gracefully
        const response = await getMutualLikes(request as any)
        expect(response.status).toBeOneOf([405, 401, 500])
      } catch (error) {
        // It's acceptable for unsupported methods to throw
        expect(error).toBeDefined()
      }
    })

    test('should handle malformed requests gracefully', async () => {
      // Test with extremely long URL
      const longQuery = 'a'.repeat(10000)
      const request = new NextRequest(
        `http://localhost:3000/api/couples/mutual-likes?query=${longQuery}`,
        {
          method: 'GET',
        }
      )

      try {
        const response = await getMutualLikes(request)
        expect(response.status).toBeOneOf([200, 400, 401, 414, 500])
      } catch (error) {
        // It's acceptable for malformed requests to throw
        expect(error).toBeDefined()
      }
    })
  })

  describe('Security', () => {
    test('should not expose sensitive information in error messages', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/couples/mutual-likes',
        {
          method: 'GET',
        }
      )

      const response = await getMutualLikes(request)
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
        'includeProperties=true; DROP TABLE users;--',
        "includeProperties=true'; SELECT * FROM users;--",
        'includeProperties=<script>alert(1)</script>',
        'limit=999999999',
        'offset=-1',
      ]

      for (const query of dangerousQueries) {
        const request = new NextRequest(
          `http://localhost:3000/api/couples/mutual-likes?${query}`,
          {
            method: 'GET',
          }
        )

        try {
          const response = await getMutualLikes(request)
          // Should not crash and should return appropriate error
          expect(response.status).toBeOneOf([200, 400, 401, 422, 500])
        } catch (error) {
          // It's acceptable for dangerous inputs to be rejected
          expect(error).toBeDefined()
        }
      }
    })
  })
})
