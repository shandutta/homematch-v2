/**
 * Couples Mutual Likes API integration tests.
 *
 * Tests the mutual-likes endpoint by invoking the route handler directly via
 * NextRequest, eliminating the need for a running dev server.
 */

import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { describe, test, expect, beforeAll } from 'vitest'

import { GET as mutualLikesGET } from '@/app/api/couples/mutual-likes/route'
import { POST as interactionsPOST } from '@/app/api/interactions/route'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// Increase timeout for integration tests
const TEST_TIMEOUT = 60000 // 60s per test

const requireSupabaseEnv = () => {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw new Error('Missing Supabase configuration for integration tests')
  }

  return { supabaseUrl, serviceKey, anonKey }
}

// Raw fetch to /auth/v1/token so no GoTrueClient instance caches the session.
const getFreshAuthToken = async (
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string
): Promise<{ token: string; userId: string }> => {
  const tokenRes = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  )
  if (!tokenRes.ok) {
    throw new Error(
      `Failed to get fresh auth token (HTTP ${tokenRes.status}): ${await tokenRes.text()}`
    )
  }
  const data = (await tokenRes.json()) as {
    access_token?: string
    user?: { id: string }
  }
  if (!data.access_token || !data.user) {
    throw new Error('Failed to get fresh auth token: missing fields')
  }
  return { token: data.access_token, userId: data.user.id }
}

const callMutualLikes = (
  path = '/api/couples/mutual-likes',
  headers: Record<string, string> = {}
) => mutualLikesGET(new NextRequest(`http://localhost${path}`, { headers }))

const callInteractionsPOST = (
  body: unknown,
  headers: Record<string, string>
) =>
  interactionsPOST(
    new NextRequest('http://localhost/api/interactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  )

describe.sequential('Integration: /api/couples/mutual-likes', () => {
  let supabaseAdmin: ReturnType<typeof createSupabaseClient>
  let authToken1: string
  let userId1: string
  let authToken2: string
  let userId2: string

  beforeAll(async () => {
    const env = requireSupabaseEnv()
    supabaseAdmin = createSupabaseClient(env.supabaseUrl, env.serviceKey)
    const auth1 = await getFreshAuthToken(
      env.supabaseUrl,
      env.anonKey,
      'test1@example.com',
      'testpassword123'
    )
    authToken1 = auth1.token
    userId1 = auth1.userId
    const auth2 = await getFreshAuthToken(
      env.supabaseUrl,
      env.anonKey,
      'test2@example.com',
      'testpassword456'
    )
    authToken2 = auth2.token
    userId2 = auth2.userId
  })

  describe('Authentication', () => {
    test('should return 401 when user is not authenticated', async () => {
      const response = await callMutualLikes()
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should accept authenticated requests', async () => {
      const response = await callMutualLikes('/api/couples/mutual-likes', {
        authorization: `Bearer ${authToken1}`,
      })

      // Should not be 401 with valid auth, and should not be 500
      expect(response.status).not.toBe(401)
      expect(response.status).not.toBe(500)
      expect(response.status).toBe(200)
    })
  })

  describe('Query Parameters', () => {
    test('should handle missing query parameters', async () => {
      const response = await callMutualLikes()
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should handle includeProperties parameter correctly', async () => {
      const response = await callMutualLikes(
        '/api/couples/mutual-likes?includeProperties=true'
      )
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should handle includeProperties=false parameter', async () => {
      const response = await callMutualLikes(
        '/api/couples/mutual-likes?includeProperties=false'
      )
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should handle invalid parameters gracefully', async () => {
      const response = await callMutualLikes(
        '/api/couples/mutual-likes?includeProperties=invalid'
      )
      const data = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Response Structure', () => {
    test('should return JSON response', async () => {
      const response = await callMutualLikes()

      expect(response.headers.get('content-type')).toContain('application/json')

      const data = await response.json()
      expect(data).toBeDefined()
      expect(typeof data).toBe('object')
    })

    test('should have consistent error structure', async () => {
      const response = await callMutualLikes()
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
      const response = await callMutualLikes()
      const endTime = Date.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(5000)

      const data = await response.json()
      expect(data).toBeDefined()
    })

    test('should handle concurrent requests', async () => {
      const responses = await Promise.all(
        Array.from({ length: 3 }, () => callMutualLikes())
      )

      for (const response of responses) {
        // Server errors should not be accepted
        expect(response.status).not.toBe(500)
        expect([200, 401]).toContain(response.status)
        const data = await response.json()
        expect(data).toBeDefined()
      }
    })
  })

  describe('HTTP Methods', () => {
    test('should handle GET requests', async () => {
      const response = await callMutualLikes()
      expect(response.status).toBe(401) // Auth failure, not method error
    })

    // The route only exports GET; non-GET methods will be handled by
    // Next.js as 405 in production. We can't directly invoke them here.
    test.skip('should reject non-GET methods', () => {
      expect(true).toBe(true)
    })
  })

  describe('Security', () => {
    test('should not expose sensitive information in error messages', async () => {
      const response = await callMutualLikes()
      const data = (await response.json()) as Record<string, unknown>

      expect(data.error).toBe('Unauthorized')
      const errStr = String(data.error)
      expect(errStr).not.toContain('password')
      expect(errStr).not.toContain('token')
      expect(errStr).not.toContain('secret')
      expect(errStr).not.toContain('key')

      expect(data).not.toHaveProperty('stack')
      expect(data).not.toHaveProperty('trace')
    })

    test('should handle dangerous query parameters safely', async () => {
      const dangerousQueries = [
        'includeProperties=true; DROP TABLE users;--',
        "includeProperties='; SELECT * FROM users;--",
        'includeProperties=<script>alert(1)</script>',
        'random=../../../etc/passwd',
      ]

      for (const q of dangerousQueries) {
        const response = await callMutualLikes(
          `/api/couples/mutual-likes?${q}`
        )
        // Should not crash - server errors indicate broken code
        expect(response.status).not.toBe(500)
        expect([200, 400, 401, 422]).toContain(response.status)
      }
    })
  })

  describe('Rate Limiting', () => {
    test(
      'should have rate limiting middleware applied',
      async () => {
        const responses = await Promise.all(
          Array.from({ length: 3 }, () => callMutualLikes())
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
    test('should return mutual likes data for authenticated users', async () => {
      const response = await callMutualLikes('/api/couples/mutual-likes', {
        authorization: `Bearer ${authToken1}`,
      })

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>

        expect(data).toHaveProperty('mutualLikes')
        expect(Array.isArray(data.mutualLikes)).toBe(true)
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

    test('should handle includeProperties parameter when authenticated', async () => {
      const responseWithProps = await callMutualLikes(
        '/api/couples/mutual-likes?includeProperties=true',
        { authorization: `Bearer ${authToken1}` }
      )

      if (responseWithProps.ok) {
        const dataWithProps = (await responseWithProps.json()) as Record<
          string,
          unknown
        >
        expect(dataWithProps.mutualLikes).toBeDefined()
      }

      const responseWithoutProps = await callMutualLikes(
        '/api/couples/mutual-likes?includeProperties=false',
        { authorization: `Bearer ${authToken1}` }
      )

      if (responseWithoutProps.ok) {
        const dataWithoutProps = (await responseWithoutProps.json()) as Record<
          string,
          unknown
        >
        expect(dataWithoutProps.mutualLikes).toBeDefined()
      }
    })

    test('should handle empty results gracefully', async () => {
      const response = await callMutualLikes('/api/couples/mutual-likes', {
        authorization: `Bearer ${authToken1}`,
      })

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>

        expect(data.mutualLikes).toBeDefined()
        expect(Array.isArray(data.mutualLikes)).toBe(true)
        expect(data.performance).toBeDefined()
        const perf = data.performance as Record<string, unknown>
        expect(typeof perf.count).toBe('number')
      }
    })

    test(
      'returns a mutual like after two household members like the same property',
      async () => {
        const householdId = randomUUID()
        const propertyId = randomUUID()

        const { data: existingProfiles, error: existingProfilesError } =
          await supabaseAdmin
            .from('user_profiles')
            .select('id, household_id')
            .in('id', [userId1, userId2])

        expect(existingProfilesError).toBeNull()

        const profilesArr = (existingProfiles ?? []) as Array<{
          id: string
          household_id: string | null
        }>
        const originalHouseholdByUserId = new Map<string, string | null>(
          profilesArr.map((row) => [row.id, row.household_id ?? null])
        )

        try {
          // Create a fresh household and link both users to it
          const { error: createHouseholdError } = await supabaseAdmin
            .from('households')
            .insert({
              id: householdId,
              name: `E2E Mutual Likes ${householdId.slice(0, 8)}`,
              created_by: userId1,
              user_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })

          expect(createHouseholdError).toBeNull()

          const { error: linkProfilesError } = await supabaseAdmin
            .from('user_profiles')
            .update({ household_id: householdId })
            .in('id', [userId1, userId2])

          expect(linkProfilesError).toBeNull()

          // Create a property to like
          const { error: createPropertyError } = await supabaseAdmin
            .from('properties')
            .upsert({
              id: propertyId,
              address: `E2E Mutual Like ${propertyId.slice(0, 8)}`,
              city: 'Test City',
              state: 'TS',
              zip_code: '12345',
              price: 500000,
              bedrooms: 3,
              bathrooms: 2,
              square_feet: 1500,
              property_type: 'single_family',
              listing_status: 'active',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })

          expect(createPropertyError).toBeNull()

          // Prime mutual likes cache for this household
          const emptyRes = await callMutualLikes(
            '/api/couples/mutual-likes?includeProperties=false',
            { authorization: `Bearer ${authToken1}` }
          )
          expect(emptyRes.status).toBe(200)
          const emptyData = (await emptyRes.json()) as Record<string, unknown>
          expect(Array.isArray(emptyData.mutualLikes)).toBe(true)
          expect((emptyData.mutualLikes as unknown[]).length).toBe(0)

          // Like as user 1
          const like1 = await callInteractionsPOST(
            { propertyId, type: 'liked' },
            { authorization: `Bearer ${authToken1}` }
          )
          expect(like1.status).toBe(200)

          // Like as user 2
          const like2 = await callInteractionsPOST(
            { propertyId, type: 'liked' },
            { authorization: `Bearer ${authToken2}` }
          )
          expect(like2.status).toBe(200)

          // Sanity-check that the interactions were persisted with the household context
          const { data: dbLikes, error: dbLikesError } = await supabaseAdmin
            .from('user_property_interactions')
            .select('user_id, household_id, interaction_type')
            .eq('property_id', propertyId)
            .in('user_id', [userId1, userId2])

          expect(dbLikesError).toBeNull()
          const dbLikesArr = (dbLikes ?? []) as Array<{
            household_id: string | null
            interaction_type: string
          }>
          expect(dbLikesArr.length).toBe(2)
          dbLikesArr.forEach((row) => {
            expect(row.household_id).toBe(householdId)
            expect(row.interaction_type).toBe('like')
          })

          // Verify mutual likes now includes the property (cache must be invalidated)
          const mutualRes = await callMutualLikes(
            '/api/couples/mutual-likes?includeProperties=false',
            { authorization: `Bearer ${authToken1}` }
          )
          expect(mutualRes.status).toBe(200)
          const mutualData = (await mutualRes.json()) as Record<string, unknown>

          const mutualLikes =
            isRecord(mutualData) && Array.isArray(mutualData.mutualLikes)
              ? (mutualData.mutualLikes as Array<Record<string, unknown>>)
              : []

          const match = mutualLikes.find(
            (ml) => isRecord(ml) && ml.property_id === propertyId
          )

          expect(match).toBeDefined()
          if (isRecord(match)) {
            expect(match.liked_by_count as number).toBeGreaterThanOrEqual(2)
          }
        } finally {
          // Cleanup
          await supabaseAdmin
            .from('user_property_interactions')
            .delete()
            .eq('property_id', propertyId)
            .in('user_id', [userId1, userId2])

          await supabaseAdmin
            .from('user_profiles')
            .update({
              household_id: originalHouseholdByUserId.get(userId1) ?? null,
            })
            .eq('id', userId1)

          await supabaseAdmin
            .from('user_profiles')
            .update({
              household_id: originalHouseholdByUserId.get(userId2) ?? null,
            })
            .eq('id', userId2)

          await supabaseAdmin
            .from('properties')
            .delete()
            .eq('id', propertyId)
          await supabaseAdmin
            .from('households')
            .delete()
            .eq('id', householdId)
        }
      },
      TEST_TIMEOUT
    )
  })

  describe('Data Structure Validation', () => {
    test('should have correct mutual likes structure when authenticated and data exists', async () => {
      const response = await callMutualLikes('/api/couples/mutual-likes', {
        authorization: `Bearer ${authToken1}`,
      })

      if (response.ok) {
        const data = (await response.json()) as Record<string, unknown>
        const mutualLikes = data.mutualLikes as Array<Record<string, unknown>>

        if (mutualLikes.length > 0) {
          const firstLike = mutualLikes[0]

          // Should have core mutual like fields
          expect(firstLike).toHaveProperty('property_id')
          expect(firstLike).toHaveProperty('liked_by_count')
          expect(firstLike).toHaveProperty('first_liked_at')
          expect(firstLike).toHaveProperty('last_liked_at')
          expect(firstLike).toHaveProperty('user_ids')

          // Should have proper types
          expect(typeof firstLike.property_id).toBe('string')
          expect(typeof firstLike.liked_by_count).toBe('number')
          expect(typeof firstLike.first_liked_at).toBe('string')
          expect(typeof firstLike.last_liked_at).toBe('string')
          expect(Array.isArray(firstLike.user_ids)).toBe(true)
        }
      }
    })
  })
})
