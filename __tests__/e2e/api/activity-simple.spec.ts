/**
 * Simplified integration test for the activity endpoint
 * Tests the actual endpoint behavior without mocking internals
 */
import { describe, test, expect } from 'vitest'

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000'

describe('Integration: /api/couples/activity', () => {
  test('should require authentication', async () => {
    const res = await fetch(`${API_URL}/api/couples/activity`)

    // Should return 401 without auth
    expect(res.status).toBe(401)

    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  test('should handle OPTIONS request for CORS', async () => {
    const res = await fetch(`${API_URL}/api/couples/activity`, {
      method: 'OPTIONS',
    })

    // Should handle CORS preflight
    expect([200, 204, 405]).toContain(res.status)
  })

  test('should reject non-GET methods', async () => {
    const methods = ['POST', 'PUT', 'DELETE', 'PATCH']

    for (const method of methods) {
      const res = await fetch(`${API_URL}/api/couples/activity`, {
        method,
        headers: {
          'content-type': 'application/json',
        },
      })

      // Should return 405 Method Not Allowed
      expect(res.status).toBe(405)
    }
  })
})
