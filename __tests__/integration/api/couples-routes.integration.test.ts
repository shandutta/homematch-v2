/**
 * Integration tests for couples API routes
 *
 * Tests the actual API routes with real database connections.
 *
 * IMPORTANT: Routes using createClient() (like mutual-likes) have a testing
 * limitation due to the global Supabase client caching in vitest.setup.ts.
 * The cache key doesn't include auth tokens, so per-test auth doesn't work.
 *
 * For comprehensive testing of the couples feature:
 * - Service layer: __tests__/integration/services/couples-e2e.test.ts
 * - Route auth: The unauthenticated test below verifies 401 handling
 *
 * Routes using createApiClient(request) (like /api/interactions) work because
 * they read auth directly from the request object, bypassing the cached client.
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { GET as getMutualLikes } from '@/app/api/couples/mutual-likes/route'
import { resetRateLimitStore } from '@/lib/utils/rate-limit'

const headerStore = new Map<string, string>()
const cookieStore = new Map<string, string>()

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
  }),
  cookies: async () => ({
    getAll: () =>
      Array.from(cookieStore.entries()).map(([name, value]) => ({
        name,
        value,
      })),
    set: (name: string, value: string) => {
      cookieStore.set(name, value)
    },
    setAll: (
      cookiesToSet: {
        name: string
        value: string
        options?: Record<string, unknown>
      }[]
    ) => {
      cookiesToSet.forEach(({ name, value }) => cookieStore.set(name, value))
    },
  }),
}))

const setAuthToken = (token?: string) => {
  headerStore.clear()
  cookieStore.clear()
  if (token) {
    headerStore.set('authorization', `Bearer ${token}`)
  }
}

describe.sequential('Integration: Couples API Routes', () => {
  const makeRequest = (url: string) => {
    return new NextRequest(new URL(url, 'http://localhost:3000'))
  }

  beforeEach(() => {
    resetRateLimitStore()
  })

  describe('/api/couples/mutual-likes', () => {
    it('should return 401 for unauthenticated requests', async () => {
      setAuthToken(undefined)

      const request = makeRequest('/api/couples/mutual-likes')
      const response = await getMutualLikes(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    // Note: Tests requiring authentication are skipped because vitest.setup.ts
    // caches Supabase clients without considering auth tokens. This means
    // per-test auth changes don't propagate to the route's createClient().
    //
    // These features are tested at the service layer in:
    // - __tests__/integration/services/couples-e2e.test.ts (real database)
    // - __tests__/unit/services/couples.test.ts (unit tests)
    it.skip('should return empty array when no mutual likes exist (skipped - see note above)', async () => {
      // Tested in couples-e2e.test.ts via CouplesService.getMutualLikes
    })

    it.skip('should return mutual likes with correct structure (skipped - see note above)', async () => {
      // Tested in couples-e2e.test.ts via CouplesService.getMutualLikes
    })

    it.skip('should include performance metrics (skipped - see note above)', async () => {
      // Tested in couples-e2e.test.ts via CouplesService.getMutualLikes
    })

    it.skip('should respect includeProperties=false parameter (skipped - see note above)', async () => {
      // Tested in couples-e2e.test.ts via CouplesService.getMutualLikes
    })
  })
})
