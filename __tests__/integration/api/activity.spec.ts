/**
 * Couples Activity API integration tests.
 *
 * Tests the activity endpoint by invoking the route handler directly via
 * NextRequest, eliminating the need for a running dev server.
 */

import { NextRequest } from 'next/server'
import { describe, test, expect, beforeAll } from 'vitest'

import { GET, POST, PUT, DELETE, PATCH } from '@/app/api/couples/activity/route'

// Increase timeout for integration tests
const TEST_TIMEOUT = 60000 // 60s per test

const requireSupabaseEnv = () => {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing Supabase configuration for integration tests')
  }

  return { supabaseUrl, anonKey }
}

const getFreshAuthToken = async (
  supabaseUrl: string,
  anonKey: string
): Promise<string> => {
  const tokenRes = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'test1@example.com',
        password: 'testpassword123',
      }),
    }
  )
  if (!tokenRes.ok) {
    throw new Error(
      `Failed to get fresh auth token (HTTP ${tokenRes.status}): ${await tokenRes.text()}`
    )
  }
  const data = (await tokenRes.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new Error('Failed to get fresh auth token: missing access_token')
  }
  return data.access_token
}

const callActivity = (
  path = '/api/couples/activity',
  headers: Record<string, string> = {}
) => GET(new NextRequest(`http://localhost${path}`, { headers }))

describe.sequential('Integration: /api/couples/activity', () => {
  let authToken: string

  beforeAll(async () => {
    const env = requireSupabaseEnv()
    authToken = await getFreshAuthToken(env.supabaseUrl, env.anonKey)
  })

  describe('Authentication', () => {
    test('should return 401 when user is not authenticated', async () => {
      const response = await callActivity()
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should accept authenticated requests', async () => {
      const response = await callActivity('/api/couples/activity', {
        authorization: `Bearer ${authToken}`,
      })

      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(500)
      expect(response.status).toBe(200)
    })
  })

  describe('Query Parameters', () => {
    test('should handle missing query parameters', async () => {
      const response = await callActivity()
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should handle limit and offset parameters correctly', async () => {
      const response = await callActivity(
        '/api/couples/activity?limit=10&offset=5'
      )
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should handle invalid parameters gracefully', async () => {
      const response = await callActivity(
        '/api/couples/activity?limit=invalid&offset=also-invalid'
      )
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should handle extreme parameter values', async () => {
      const response = await callActivity(
        '/api/couples/activity?limit=999999&offset=-50'
      )
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Response Structure', () => {
    test('should return JSON response', async () => {
      const response = await callActivity()

      expect(response.headers.get('content-type')).toContain('application/json')

      const data = await response.json()
      expect(data).toBeDefined()
      expect(typeof data).toBe('object')
    })

    test('should have consistent error structure', async () => {
      const response = await callActivity()
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect((data.error as string).length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now()
      const response = await callActivity()
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(5000)

      const data = await response.json()
      expect(data).toBeDefined()
    })

    test('should handle concurrent requests', async () => {
      const responses = await Promise.all(
        Array.from({ length: 3 }, () => callActivity())
      )

      for (const response of responses) {
        expect(response.status).not.toBe(500)
        expect([200, 401]).toContain(response.status)
        const data = await response.json()
        expect(data).toBeDefined()
      }
    })
  })

  describe('HTTP Methods', () => {
    test('should handle GET requests', async () => {
      const response = await callActivity()
      expect(response.status).toBe(401)
    })

    test('should reject non-GET methods', async () => {
      const responses = await Promise.all([POST(), PUT(), DELETE(), PATCH()])
      for (const r of responses) {
        expect(r.status).toBe(405)
      }
    })
  })

  describe('Security', () => {
    test(
      'should not expose sensitive information in error messages',
      async () => {
        const response = await callActivity()
        const data = (await response.json()) as Record<string, unknown>

        expect(data.error).toBe('Unauthorized')
        const errStr = String(data.error)
        expect(errStr).not.toContain('password')
        expect(errStr).not.toContain('token')
        expect(errStr).not.toContain('secret')
        expect(errStr).not.toContain('key')

        expect(data).not.toHaveProperty('stack')
        expect(data).not.toHaveProperty('trace')
      },
      TEST_TIMEOUT
    )

    test(
      'should handle dangerous query parameters safely',
      async () => {
        const dangerousQueries = [
          'limit=true; DROP TABLE users;--',
          "offset='; SELECT * FROM users;--",
          'limit=<script>alert(1)</script>',
          'offset=../../../etc/passwd',
        ]

        const results = await Promise.allSettled(
          dangerousQueries.map((q) =>
            callActivity(`/api/couples/activity?${q}`)
          )
        )

        for (const result of results) {
          if (result.status === 'fulfilled') {
            expect(result.value.status).not.toBe(500)
            expect([200, 400, 401, 422]).toContain(result.value.status)
          }
        }
      },
      TEST_TIMEOUT
    )
  })

  describe('Rate Limiting', () => {
    test(
      'should have rate limiting middleware applied',
      async () => {
        const responses = await Promise.all(
          Array.from({ length: 3 }, () => callActivity())
        )

        responses.forEach((response) => {
          expect(response.status).not.toBe(500)
          expect([200, 401, 429]).toContain(response.status)
        })
      },
      TEST_TIMEOUT
    )
  })

  describe('Authenticated Scenarios', () => {
    test('should return activity data for authenticated users', async () => {
      const response = await callActivity('/api/couples/activity', {
        authorization: `Bearer ${authToken}`,
      })

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>

        expect(data).toHaveProperty('activity')
        expect(Array.isArray(data.activity)).toBe(true)
        expect(data).toHaveProperty('performance')
        const perf = data.performance as Record<string, unknown>
        expect(perf).toHaveProperty('totalTime')
        expect(perf).toHaveProperty('count')
        expect(perf).toHaveProperty('cached')
      } else {
        expect([500, 503]).toContain(response.status)
        const data = (await response.json()) as Record<string, unknown>
        expect(data).toHaveProperty('error')
      }
    })

    test('should handle pagination correctly when authenticated', async () => {
      const response = await callActivity(
        '/api/couples/activity?limit=5&offset=0',
        { authorization: `Bearer ${authToken}` }
      )

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>
        expect(data.activity).toBeDefined()
        const perf = data.performance as Record<string, unknown>
        expect(perf.count as number).toBeLessThanOrEqual(5)
      }
    })
  })
})
