/* eslint-disable @typescript-eslint/consistent-type-assertions */
/**
 * Integration tests for /api/couples/check-mutual endpoint
 * Tests the mutual like checking functionality
 */
import { describe, test, expect, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'

import {
  GET,
  POST,
  PUT,
  DELETE,
  PATCH,
} from '@/app/api/couples/check-mutual/route'

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

const buildGet = (path: string, headers: Record<string, string> = {}) =>
  GET(new NextRequest(`http://localhost${path}`, { headers }))

describe.sequential(
  'Integration: /api/couples/check-mutual (authenticated)',
  () => {
    let authToken: string

    beforeAll(async () => {
      const env = requireSupabaseEnv()
      authToken = await getFreshAuthToken(env.supabaseUrl, env.anonKey)
    })

    test('should return 401 without authentication', async () => {
      const response = await buildGet(
        '/api/couples/check-mutual?propertyId=test-property-123'
      )
      const body = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    test('should return 400 without propertyId parameter', async () => {
      const response = await buildGet('/api/couples/check-mutual', {
        authorization: `Bearer ${authToken}`,
      })
      const body = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(400)
      expect(body.error).toBe('Property ID is required')
    })

    test('should return 400 with empty propertyId parameter', async () => {
      const response = await buildGet('/api/couples/check-mutual?propertyId=', {
        authorization: `Bearer ${authToken}`,
      })
      const body = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(400)
      expect(body.error).toBe('Property ID is required')
    })

    test('should check mutual like status for valid propertyId', async () => {
      const testPropertyId = 'test-property-123'
      const response = await buildGet(
        `/api/couples/check-mutual?propertyId=${testPropertyId}`,
        { authorization: `Bearer ${authToken}` }
      )
      const body = (await response.json()) as Record<string, unknown>

      // Server errors (500) should not be accepted - they indicate broken code
      expect(response.status).not.toBe(500)
      expect(response.status).toBe(200)

      expect(body.isMutual).toBeDefined()
      expect(typeof body.isMutual).toBe('boolean')

      if (body.isMutual === true) {
        // If it's a mutual like, should have additional information
        expect(body.partnerName).toBeDefined()
        expect(typeof body.partnerName).toBe('string')
        expect((body.partnerName as string).length).toBeGreaterThan(0)

        expect(body.propertyAddress).toBeDefined()
        expect(typeof body.propertyAddress).toBe('string')
        expect((body.propertyAddress as string).length).toBeGreaterThan(0)

        // Optional fields
        if (body.streak !== undefined) {
          expect(typeof body.streak).toBe('number')
          expect(body.streak as number).toBeGreaterThanOrEqual(0)
        }

        if (body.milestone !== undefined && isRecord(body.milestone)) {
          expect(body.milestone.type).toBeDefined()
          expect(body.milestone.count).toBeDefined()
          expect(typeof body.milestone.count).toBe('number')
          expect(body.milestone.count as number).toBeGreaterThan(0)
        }
      } else {
        // If not mutual, should only have isMutual field
        expect(body.isMutual).toBe(false)
        expect(Object.keys(body)).toEqual(['isMutual'])
      }
    })

    test('should handle non-existent propertyId gracefully', async () => {
      const nonExistentPropertyId = 'non-existent-property-999999'
      const response = await buildGet(
        `/api/couples/check-mutual?propertyId=${nonExistentPropertyId}`,
        { authorization: `Bearer ${authToken}` }
      )
      const body = (await response.json()) as Record<string, unknown>

      // Server errors should not be accepted
      expect(response.status).not.toBe(500)
      expect(response.status).toBe(200)
      // Should return false for non-existent properties
      expect(body.isMutual).toBe(false)
    })

    test('should handle URL encoding in propertyId', async () => {
      const encodedPropertyId = encodeURIComponent(
        'property-with-special-chars-#123'
      )
      const response = await buildGet(
        `/api/couples/check-mutual?propertyId=${encodedPropertyId}`,
        { authorization: `Bearer ${authToken}` }
      )
      const body = (await response.json()) as Record<string, unknown>

      // Server errors should not be accepted
      expect(response.status).not.toBe(500)
      expect(response.status).toBe(200)
      expect(body.isMutual).toBeDefined()
      expect(typeof body.isMutual).toBe('boolean')
    })

    test('should reject non-GET methods', async () => {
      // The route exports explicit 405 handlers for these methods.
      const responses = await Promise.all([POST(), PUT(), DELETE(), PATCH()])
      for (const r of responses) {
        expect(r.status).toBe(405)
      }
    })

    test('should handle malformed auth tokens', async () => {
      const testPropertyId = 'test-property-123'
      const response = await buildGet(
        `/api/couples/check-mutual?propertyId=${testPropertyId}`,
        { authorization: 'Bearer invalid-token-format' }
      )
      const body = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    test('should handle multiple query parameters correctly', async () => {
      const testPropertyId = 'test-property-123'
      const response = await buildGet(
        `/api/couples/check-mutual?propertyId=${testPropertyId}&extraParam=ignore&another=value`,
        { authorization: `Bearer ${authToken}` }
      )
      const body = (await response.json()) as Record<string, unknown>

      // Server errors should not be accepted
      expect(response.status).not.toBe(500)
      expect(response.status).toBe(200)
      expect(body.isMutual).toBeDefined()
      expect(typeof body.isMutual).toBe('boolean')
    })

    test('should respond within reasonable time', async () => {
      const testPropertyId = 'test-property-123'
      const startTime = Date.now()
      const response = await buildGet(
        `/api/couples/check-mutual?propertyId=${testPropertyId}`,
        { authorization: `Bearer ${authToken}` }
      )
      const endTime = Date.now()

      // Server errors should not be accepted - they indicate broken code
      expect(response.status).not.toBe(500)
      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(5000)
    })

    test('should handle concurrent requests for same property', async () => {
      const testPropertyId = 'test-property-concurrent'
      const responses = await Promise.all(
        Array.from({ length: 3 }, () =>
          buildGet(`/api/couples/check-mutual?propertyId=${testPropertyId}`, {
            authorization: `Bearer ${authToken}`,
          })
        )
      )

      // All responses should have the same result for the same property
      for (const response of responses) {
        const body = (await response.json()) as Record<string, unknown>
        // Server errors should not be accepted
        expect(response.status).not.toBe(500)
        expect(response.status).toBe(200)
        expect(body.isMutual).toBeDefined()
        expect(typeof body.isMutual).toBe('boolean')
      }
    })

    test('should validate milestone structure when present', async () => {
      const testPropertyId = 'test-property-milestone'
      const response = await buildGet(
        `/api/couples/check-mutual?propertyId=${testPropertyId}`,
        { authorization: `Bearer ${authToken}` }
      )
      const body = (await response.json()) as Record<string, unknown>

      if (
        response.status === 200 &&
        body.isMutual === true &&
        isRecord(body.milestone)
      ) {
        expect(body.milestone.type).toBe('mutual_likes')
        expect(typeof body.milestone.count).toBe('number')
        expect(body.milestone.count as number).toBeGreaterThan(0)
        expect((body.milestone.count as number) % 5).toBe(0)
      }
    })

    test('should handle special characters in propertyId', async () => {
      const specialPropertyIds = [
        'property-with-dashes',
        'property_with_underscores',
        'property123',
        'PROPERTY-UPPERCASE',
      ]

      for (const propertyId of specialPropertyIds) {
        const response = await buildGet(
          `/api/couples/check-mutual?propertyId=${propertyId}`,
          { authorization: `Bearer ${authToken}` }
        )
        const body = (await response.json()) as Record<string, unknown>

        // Server errors should not be accepted
        expect(response.status).not.toBe(500)
        expect(response.status).toBe(200)
        expect(body.isMutual).toBeDefined()
        expect(typeof body.isMutual).toBe('boolean')
      }
    })
  }
)
