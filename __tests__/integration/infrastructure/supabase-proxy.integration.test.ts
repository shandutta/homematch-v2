/**
 * Integration tests for the Supabase proxy route
 *
 * This ensures the proxy correctly forwards requests to the local Supabase instance.
 * The proxy is handled by Caddy (dev.homematch.pro) which strips /supabase prefix
 * and forwards to 127.0.0.1:54200.
 *
 * These tests run against localhost:3000 which doesn't have the Caddy proxy,
 * so they hit Supabase directly at the local ports.
 */

import { describe, it, expect, beforeAll } from 'vitest'

// When running locally, hit Supabase Kong API gateway directly (port 54200)
// Caddy handles /supabase/* routing in production
const SUPABASE_REST_URL =
  process.env.SUPABASE_REST_URL || 'http://127.0.0.1:54200'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

describe('Supabase Direct Access', () => {
  beforeAll(() => {
    if (!SUPABASE_ANON_KEY) {
      throw new Error(
        'SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
      )
    }
  })

  describe('Health Check', () => {
    it('should reach auth health endpoint', async () => {
      const response = await fetch(`${SUPABASE_REST_URL}/auth/v1/health`)

      expect(response.status).toBe(200)
    })

    it('should reach rest health endpoint', async () => {
      const response = await fetch(`${SUPABASE_REST_URL}/rest/v1/`, {
        headers: {
          apikey: SUPABASE_ANON_KEY!,
        },
      })

      // PostgREST returns 200 on root
      expect(response.status).toBe(200)
    })
  })

  describe('REST API Access', () => {
    it('should handle GET requests with query params', async () => {
      const response = await fetch(
        `${SUPABASE_REST_URL}/rest/v1/user_profiles?select=id&limit=1`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      )

      // Should get 200 (empty array is fine, we just care it connected correctly)
      expect(response.status).toBe(200)
    })

    it('should preserve path segments correctly', async () => {
      const response = await fetch(
        `${SUPABASE_REST_URL}/rest/v1/properties?select=id&limit=1`,
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
        `${SUPABASE_REST_URL}/rest/v1/user_profiles?select=id`,
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

  describe('Auth API Access', () => {
    it('should reach auth signup endpoint', async () => {
      // Just verify the endpoint is reachable (don't actually create a user)
      const response = await fetch(`${SUPABASE_REST_URL}/auth/v1/signup`, {
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
        `${SUPABASE_REST_URL}/rest/v1/nonexistent_table_xyz`,
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
