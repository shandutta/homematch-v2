/**
 * Integration tests for /api/health endpoint
 * Tests the health check functionality including database connectivity
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

const fetchJson = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
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

describe('Integration: /api/health', () => {
  beforeAll(() => {
    // Ensure we have a base URL to test against
    if (!BASE_URL) {
      throw new Error('BASE_URL environment variable is required for integration tests')
    }
  })

  test('should return health status with proper structure', async () => {
    const { status, body, headers } = await fetchJson('/api/health')

    // Should return either 200 (healthy) or 503 (unhealthy)
    expect([200, 503]).toContain(status)
    
    // Check response headers
    expect(headers.get('content-type')).toContain('application/json')
    expect(headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate')

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
    const { body } = await fetchJson('/api/health')

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
    const { status, body } = await fetchJson('/api/health')

    if (body.database === 'connected') {
      expect(status).toBe(200)
      expect(body.status).toBe('healthy')
      expect(body.database_error).toBeUndefined()
    }
  })

  test('should return 503 when database has issues', async () => {
    const { status, body } = await fetchJson('/api/health')

    if (body.database === 'error') {
      expect(status).toBe(503)
      expect(body.status).toBe('healthy') // Service itself is healthy, just DB connection issue
      expect(body.database_error).toBeDefined()
    }
  })

  test('should handle multiple concurrent requests', async () => {
    // Test that health endpoint can handle concurrent requests
    const requests = Array.from({ length: 5 }, () => fetchJson('/api/health'))
    const responses = await Promise.all(requests)

    responses.forEach(({ status, body }) => {
      expect([200, 503]).toContain(status)
      expect(body.service).toBe('HomeMatch V2')
      expect(body.version).toBe('2.0.0')
    })
  })

  test('should have consistent response structure across calls', async () => {
    const { body: body1 } = await fetchJson('/api/health')
    const { body: body2 } = await fetchJson('/api/health')

    // Both responses should have the same structure
    const keys1 = Object.keys(body1).sort()
    const keys2 = Object.keys(body2).sort()
    
    expect(keys1).toEqual(keys2)
    
    // Static fields should be the same
    expect(body1.service).toBe(body2.service)
    expect(body1.version).toBe(body2.version)
  })

  test('should handle OPTIONS request for CORS', async () => {
    const res = await fetch(`${BASE_URL}/api/health`, {
      method: 'OPTIONS',
    })

    // OPTIONS should be handled properly (204 for CORS preflight, or 200/405)
    expect([200, 204, 405]).toContain(res.status)
  })

  test('should reject non-GET methods appropriately', async () => {
    const methods = ['POST', 'PUT', 'DELETE', 'PATCH']
    
    for (const method of methods) {
      const res = await fetch(`${BASE_URL}/api/health`, {
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