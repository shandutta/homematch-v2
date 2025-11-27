/**
 * Integration tests for the Supabase local proxy route
 *
 * This ensures the proxy correctly forwards requests to the local Supabase instance.
 * The proxy is critical for development when using a reverse proxy (e.g., Caddy)
 * that routes all traffic through Next.js.
 */

import { describe, it, expect, beforeAll } from 'vitest'

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

describe('Supabase Proxy Route', () => {
  beforeAll(() => {
    if (!SUPABASE_ANON_KEY) {
      throw new Error(
        'SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
      )
    }
  })

  describe('Health Check', () => {
    it('should proxy auth health endpoint', async () => {
      const response = await fetch(`${TEST_BASE_URL}/supabase/auth/v1/health`)

      expect(response.status).toBe(200)
      expect(response.headers.get('x-supabase-proxy-target')).toBeTruthy()
    })

    it('should proxy rest health endpoint', async () => {
      const response = await fetch(`${TEST_BASE_URL}/supabase/rest/v1/`, {
        headers: {
          apikey: SUPABASE_ANON_KEY!,
        },
      })

      // PostgREST returns 200 on root
      expect(response.status).toBe(200)
    })
  })

  describe('REST API Proxying', () => {
    it('should proxy GET requests with query params', async () => {
      const response = await fetch(
        `${TEST_BASE_URL}/supabase/rest/v1/user_profiles?select=id&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      )

      // Should get 200 (empty array is fine, we just care it proxied correctly)
      expect(response.status).toBe(200)
      expect(response.headers.get('x-supabase-proxy-target')).toBeTruthy()
    })

    it('should preserve path segments correctly', async () => {
      // Test that the [...path] catch-all correctly joins path segments
      const response = await fetch(
        `${TEST_BASE_URL}/supabase/rest/v1/properties?select=id&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      )

      expect(response.status).toBe(200)
    })

    it('should forward authorization headers', async () => {
      // Without auth header, should still work but return empty due to RLS
      const response = await fetch(
        `${TEST_BASE_URL}/supabase/rest/v1/user_profiles?select=id`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      )

      expect(response.status).toBe(200)
      // RLS should return empty array for anon user
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('Auth API Proxying', () => {
    it('should proxy auth signup endpoint', async () => {
      // Just verify the endpoint is reachable (don't actually create a user)
      const response = await fetch(`${TEST_BASE_URL}/supabase/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-test@test.com',
          password: 'x', // Too short, will fail validation
        }),
      })

      // Should get a validation error (422) or similar, not 404/502
      expect([400, 422, 500]).toContain(response.status)
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent tables', async () => {
      const response = await fetch(
        `${TEST_BASE_URL}/supabase/rest/v1/nonexistent_table_xyz`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY!,
          },
        }
      )

      // PostgREST returns 404 for non-existent tables
      expect(response.status).toBe(404)
    })
  })
})
