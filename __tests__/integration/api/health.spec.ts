/**
 * Integration tests for /api/health endpoint
 * Tests the health check functionality including database connectivity.
 * Invokes the route handler directly so no dev server is required (CI runs
 * with SKIP_DEV_SERVER=true).
 */

import { NextRequest } from 'next/server'
import { describe, test, expect } from 'vitest'

import { GET } from '@/app/api/health/route'

// Increase timeout for integration tests making real DB queries
const TEST_TIMEOUT = 60000 // 60s per test

describe('Integration: /api/health', () => {
  test(
    'should return health status with proper structure',
    async () => {
      const req = new NextRequest('http://localhost/api/health')
      const response = await GET(req)
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
    },
    TEST_TIMEOUT
  )

  test(
    'should include database connectivity information',
    async () => {
      const req = new NextRequest('http://localhost/api/health')
      const response = await GET(req)
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
    },
    TEST_TIMEOUT
  )

  test(
    'should return 200 when database is connected',
    async () => {
      const req = new NextRequest('http://localhost/api/health')
      const response = await GET(req)
      const body = await response.json()

      if (body.database === 'connected') {
        expect(response.status).toBe(200)
        expect(body.status).toBe('healthy')
        expect(body.database_error).toBeUndefined()
      }
    },
    TEST_TIMEOUT
  )
})
