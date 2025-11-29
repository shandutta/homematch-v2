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

import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

import { GET as getMutualLikes } from '@/app/api/couples/mutual-likes/route'
import { resetRateLimitStore } from '@/lib/utils/rate-limit'
import type { Database } from '@/types/database'

// Auth token stored for use in request headers - refreshed at test start
let currentAuthToken: string | undefined

const setAuthToken = (token?: string) => {
  currentAuthToken = token
}

/**
 * Gets a fresh auth token by signing in as the test user.
 * This avoids token expiration issues with the static .test-auth-token file.
 */
const getFreshAuthToken = async (): Promise<string> => {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase configuration for auth')
  }

  const supabase = createSupabaseClient<Database>(supabaseUrl, anonKey)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test1@example.com',
    password: 'testpassword123',
  })

  if (error || !data.session) {
    throw new Error(`Failed to get fresh auth token: ${error?.message}`)
  }

  return data.session.access_token
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

  beforeAll(async () => {
    // Get fresh token by signing in (avoids token expiration issues)
    authToken = await getFreshAuthToken()
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
