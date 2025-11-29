/**
 * Integration tests for couples API routes
 *
 * Tests the actual API routes with real database connections.
 *
 * NOTE: The mutual-likes route now uses createApiClient(request) which reads
 * auth directly from the request headers, enabling proper integration testing.
 *
 * For comprehensive testing of the couples feature:
 * - Service layer: __tests__/integration/services/couples-e2e.test.ts
 * - Route auth: Tests below verify auth handling via request headers
 */

import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

import { GET as getMutualLikes } from '@/app/api/couples/mutual-likes/route'
import { resetRateLimitStore } from '@/lib/utils/rate-limit'

// Auth token stored for use in request headers
let currentAuthToken: string | undefined

const setAuthToken = (token?: string) => {
  currentAuthToken = token
}

const loadTestAuthToken = () => {
  if (process.env.TEST_AUTH_TOKEN) return process.env.TEST_AUTH_TOKEN
  const tokenPath = path.join(process.cwd(), '.test-auth-token')
  if (fs.existsSync(tokenPath)) {
    return fs.readFileSync(tokenPath, 'utf8').trim()
  }
  return null
}

// Mock next/headers for module loading (createApiClient reads from request.headers)
vi.mock('next/headers', () => ({
  headers: async () => ({
    get: () => null,
  }),
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
    setAll: () => {},
  }),
}))

describe.sequential('Integration: Couples API Routes', () => {
  let authToken: string

  const makeAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (currentAuthToken) {
      headers['authorization'] = `Bearer ${currentAuthToken}`
    }
    return headers
  }

  const makeRequest = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`
    return new NextRequest(fullUrl, {
      method: 'GET',
      headers: makeAuthHeaders(),
    })
  }

  beforeAll(() => {
    const token = loadTestAuthToken()
    if (!token) {
      throw new Error(
        'Missing test auth token. Run integration setup to generate .test-auth-token.'
      )
    }
    authToken = token
  })

  beforeEach(() => {
    setAuthToken(authToken)
    resetRateLimitStore()
  })

  describe('/api/couples/mutual-likes', () => {
    // IMPORTANT: Authenticated test must run first to cache a client with auth
    // (vitest.setup.ts caches Supabase clients without considering auth tokens)
    it('should return mutual likes response for authenticated user', async () => {
      const request = makeRequest('/api/couples/mutual-likes')
      const response = await getMutualLikes(request)

      // Should be 200 (success) - user may or may not have mutual likes
      expect(response.status).toBe(200)
      const data = await response.json()

      // Verify response structure
      expect(data).toHaveProperty('mutualLikes')
      expect(Array.isArray(data.mutualLikes)).toBe(true)
      expect(data).toHaveProperty('performance')
      expect(data.performance).toHaveProperty('totalTime')
    })

    it('should include performance metrics in response', async () => {
      const request = makeRequest('/api/couples/mutual-likes')
      const response = await getMutualLikes(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.performance).toHaveProperty('totalTime')
      expect(typeof data.performance.totalTime).toBe('number')
    })

    it('should respect includeProperties=false parameter', async () => {
      const request = makeRequest(
        '/api/couples/mutual-likes?includeProperties=false'
      )
      const response = await getMutualLikes(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // When includeProperties=false, mutual likes should not have property details
      // (if there are any mutual likes)
      expect(data).toHaveProperty('mutualLikes')
      if (data.mutualLikes.length > 0) {
        // Properties should not be enriched
        expect(data.mutualLikes[0].property).toBeUndefined()
      }
    })
  })
})
