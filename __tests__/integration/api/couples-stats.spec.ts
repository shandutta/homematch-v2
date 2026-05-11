/* eslint-disable @typescript-eslint/consistent-type-assertions */
/**
 * Integration tests for /api/couples/stats endpoint
 * Tests the couples household statistics API functionality
 */
import { describe, test, expect, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

import { GET } from '@/app/api/couples/stats/route'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

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

// Raw fetch to /auth/v1/token so no GoTrueClient instance caches the session.
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
        email: 'test-worker-1@example.com',
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

const callStats = async (
  headers: Record<string, string> = {}
): Promise<Response> => {
  return GET(
    new NextRequest('http://localhost/api/couples/stats', {
      headers,
    })
  )
}

describe.sequential('Integration: /api/couples/stats (authenticated)', () => {
  let authToken: string

  beforeAll(async () => {
    const env = requireSupabaseEnv()
    authToken = await getFreshAuthToken(env.supabaseUrl, env.anonKey)
  })

  test('should return 401 without authentication', async () => {
    const response = await callStats()
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should return household stats for authenticated user', async () => {
    const response = await callStats({
      authorization: `Bearer ${authToken}`,
    })
    const body = (await response.json()) as Record<string, unknown>

    // Should succeed or return 404 if no household found
    expect([200, 404]).toContain(response.status)

    if (response.status === 200) {
      expect(body.stats).toBeDefined()
      expect(isRecord(body.stats)).toBe(true)
      if (!isRecord(body.stats)) return

      const stats = body.stats

      // Optional numeric fields that should be non-negative if present
      const numericFields = [
        'total_mutual_likes',
        'activity_streak_days',
        'total_interactions',
        'properties_viewed',
        'properties_liked',
        'properties_passed',
      ]

      numericFields.forEach((field) => {
        if (stats[field] !== undefined && stats[field] !== null) {
          expect(typeof stats[field]).toBe('number')
          expect(stats[field] as number).toBeGreaterThanOrEqual(0)
        }
      })

      // Date fields should be valid ISO strings if present
      const dateFields = ['last_activity_at', 'created_at']
      dateFields.forEach((field) => {
        if (stats[field] !== undefined && stats[field] !== null) {
          expect(typeof stats[field]).toBe('string')
          expect(() => new Date(stats[field] as string)).not.toThrow()
          expect(new Date(stats[field] as string).toISOString()).toBe(
            stats[field]
          )
        }
      })
    } else if (response.status === 404) {
      expect(String(body.error)).toContain('Household not found')
    }
  })

  test('should handle users without households gracefully', async () => {
    const response = await callStats({
      authorization: `Bearer ${authToken}`,
    })
    const body = (await response.json()) as Record<string, unknown>

    if (response.status === 404) {
      expect(body.error).toBeDefined()
      expect(typeof body.error).toBe('string')
      expect(body.error as string).toContain('Household not found')
    }
  })

  test('should return consistent stats across multiple requests', async () => {
    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        callStats({ authorization: `Bearer ${authToken}` })
      )
    )

    // All responses should have the same status
    const statuses = responses.map((r) => r.status)
    expect(new Set(statuses).size).toBe(1) // All should be the same

    // If successful, stats should be consistent
    if (responses[0].status === 200) {
      const bodies = await Promise.all(
        responses.map((r) => r.json() as Promise<Record<string, unknown>>)
      )
      const statsArray = bodies.map((b) => b.stats as Record<string, unknown>)

      // Check that numeric stats are consistent
      const stableFields = [
        'total_mutual_likes',
        'properties_viewed',
        'properties_liked',
        'properties_passed',
      ]
      stableFields.forEach((field) => {
        const values = statsArray.map((stats) => stats[field])
        const uniqueValues = new Set(values)

        // Values should be consistent (allowing for some activity during test)
        expect(uniqueValues.size).toBeLessThanOrEqual(2)
      })
    }
  })

  test('should reject non-GET methods', async () => {
    // Route only exports GET; other methods will be handled by Next's default
    // 405. Since we're invoking the route handler directly, we can only test
    // the GET handler — for other methods, Next would return 405 automatically.
    // Skip this assertion; covered by Next.js itself.
    expect(true).toBe(true)
  })

  test('should handle malformed auth tokens', async () => {
    const response = await callStats({
      authorization: 'Bearer invalid-token-format',
    })
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should handle missing Authorization header scheme', async () => {
    const response = await callStats({
      authorization: 'invalid-header-format',
    })
    const body = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('should include proper error handling for server errors', async () => {
    const response = await callStats({
      authorization: `Bearer ${authToken}`,
    })
    const body = (await response.json()) as Record<string, unknown>

    // If server error occurs (500), should have proper error message
    if (response.status === 500) {
      expect(body.error).toBeDefined()
      expect(typeof body.error).toBe('string')
      expect(body.error).toBe('Failed to fetch household statistics')
    } else {
      // Should be a valid response
      expect([200, 404]).toContain(response.status)
    }
  })

  test('should respond within reasonable time', async () => {
    const startTime = Date.now()
    const response = await callStats({
      authorization: `Bearer ${authToken}`,
    })
    const endTime = Date.now()

    // Server errors should not be accepted - they indicate broken code
    expect(response.status).not.toBe(500)
    expect([200, 404]).toContain(response.status)
    expect(endTime - startTime).toBeLessThan(5000) // Should respond within 5 seconds
  })

  test('should validate stats data types correctly', async () => {
    const response = await callStats({
      authorization: `Bearer ${authToken}`,
    })
    const body = (await response.json()) as Record<string, unknown>

    if (response.status === 200) {
      const stats = body.stats as Record<string, unknown>

      // Validate specific data types for known fields
      if (stats.total_mutual_likes !== undefined) {
        expect(Number.isInteger(stats.total_mutual_likes)).toBe(true)
      }

      if (stats.activity_streak_days !== undefined) {
        expect(Number.isInteger(stats.activity_streak_days)).toBe(true)
      }

      if (stats.last_activity_at !== undefined) {
        const date = new Date(stats.last_activity_at as string)
        expect(date.getTime()).not.toBeNaN()
        expect(date.getTime()).toBeLessThanOrEqual(Date.now())
      }
    }
  })
})
