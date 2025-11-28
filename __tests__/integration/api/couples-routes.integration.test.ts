/**
 * Integration tests for couples API routes
 *
 * Tests the actual API routes with real database connections.
 * Focus on /api/couples/mutual-likes which uses the async createClient()
 * that properly reads from mocked next/headers.
 *
 * Note: The stats and activity routes use createApiClient(request) which
 * requires a different testing pattern. Those routes are tested via
 * the CouplesService integration tests in couples-e2e.test.ts.
 */

import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from 'vitest'

import { GET as getMutualLikes } from '@/app/api/couples/mutual-likes/route'
import type { Database } from '@/types/database'
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

const loadTestAuthToken = () => {
  if (process.env.TEST_AUTH_TOKEN) return process.env.TEST_AUTH_TOKEN
  const tokenPath = path.join(process.cwd(), '.test-auth-token')
  if (fs.existsSync(tokenPath)) {
    return fs.readFileSync(tokenPath, 'utf8').trim()
  }
  return null
}

describe.sequential('Integration: Couples API Routes', () => {
  let supabaseAdmin: ReturnType<typeof createSupabaseClient<Database>>
  let authToken: string
  let testUserId: string
  let testHouseholdId: string
  let partnerUserId: string
  let createdPropertyIds: string[] = []

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

  const decodeUserId = (token: string) => {
    const parts = token.split('.')
    if (parts.length < 2) throw new Error('Invalid JWT for test auth user')
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf8')
    ) as { sub?: string }
    if (!payload.sub) throw new Error('JWT missing subject')
    return payload.sub
  }

  const createTestProperty = async () => {
    const id = randomUUID()
    const { error } = await supabaseAdmin.from('properties').upsert([
      {
        id,
        address: `Couples Test ${id.slice(0, 8)}`,
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
      },
    ])

    if (error) throw error
    createdPropertyIds.push(id)
    return id
  }

  const makeRequest = (url: string) => {
    return new NextRequest(new URL(url, 'http://localhost:3000'))
  }

  beforeAll(async () => {
    const { supabaseUrl, serviceKey } = requireSupabaseEnv()
    supabaseAdmin = createSupabaseClient<Database>(supabaseUrl, serviceKey)

    // Load auth token
    const token = loadTestAuthToken()
    if (!token) {
      throw new Error('No test auth token available')
    }
    authToken = token
    testUserId = decodeUserId(token)

    // Create a test household
    testHouseholdId = randomUUID()
    const { error: householdError } = await supabaseAdmin
      .from('households')
      .upsert([
        {
          id: testHouseholdId,
          name: 'Test Household for Couples API',
          created_by: testUserId,
          user_count: 2,
          created_at: new Date().toISOString(),
        },
      ])

    if (householdError) {
      console.warn('Could not create test household:', householdError)
    }

    // Associate test user with household
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ household_id: testHouseholdId })
      .eq('id', testUserId)

    if (updateError) {
      console.warn('Could not associate user with household:', updateError)
    }

    // Create a partner user profile
    partnerUserId = randomUUID()
    const { error: partnerError } = await supabaseAdmin
      .from('user_profiles')
      .upsert([
        {
          id: partnerUserId,
          email: `partner-${Date.now()}@test.example.com`,
          display_name: 'Test Partner',
          household_id: testHouseholdId,
          onboarding_completed: true,
          preferences: {},
        },
      ])

    if (partnerError) {
      console.warn('Could not create partner profile:', partnerError)
    }
  })

  afterAll(async () => {
    // Clean up test data
    if (createdPropertyIds.length > 0) {
      await supabaseAdmin
        .from('user_property_interactions')
        .delete()
        .in('property_id', createdPropertyIds)

      await supabaseAdmin
        .from('properties')
        .delete()
        .in('id', createdPropertyIds)
    }

    // Reset user's household association
    await supabaseAdmin
      .from('user_profiles')
      .update({ household_id: null })
      .eq('id', testUserId)

    // Clean up partner
    if (partnerUserId) {
      await supabaseAdmin.from('user_profiles').delete().eq('id', partnerUserId)
    }

    // Clean up household
    if (testHouseholdId) {
      await supabaseAdmin.from('households').delete().eq('id', testHouseholdId)
    }
  })

  beforeEach(() => {
    resetRateLimitStore()
    setAuthToken(authToken)
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

    it('should return empty array when no mutual likes exist', async () => {
      const request = makeRequest('/api/couples/mutual-likes')
      const response = await getMutualLikes(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.mutualLikes).toBeDefined()
      expect(Array.isArray(data.mutualLikes)).toBe(true)
      expect(data.performance).toBeDefined()
      expect(typeof data.performance.totalTime).toBe('number')
    })

    it('should return mutual likes with correct structure', async () => {
      // Create a property and have both users like it
      const propertyId = await createTestProperty()

      // Create likes from both household members
      await supabaseAdmin.from('user_property_interactions').insert([
        {
          user_id: testUserId,
          property_id: propertyId,
          household_id: testHouseholdId,
          interaction_type: 'like',
          created_at: new Date().toISOString(),
        },
        {
          user_id: partnerUserId,
          property_id: propertyId,
          household_id: testHouseholdId,
          interaction_type: 'like',
          created_at: new Date().toISOString(),
        },
      ])

      const request = makeRequest(
        '/api/couples/mutual-likes?includeProperties=true'
      )
      const response = await getMutualLikes(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.mutualLikes).toBeDefined()
      expect(data.mutualLikes.length).toBeGreaterThanOrEqual(1)

      // Verify structure of mutual like
      const mutualLike = data.mutualLikes.find(
        (ml: { property_id: string }) => ml.property_id === propertyId
      )
      expect(mutualLike).toBeDefined()
      expect(mutualLike.property_id).toBe(propertyId)
      expect(mutualLike.liked_by_count).toBeGreaterThanOrEqual(2)
      expect(mutualLike.property).toBeDefined()
      expect(mutualLike.property.address).toBeDefined()

      // Clean up
      await supabaseAdmin
        .from('user_property_interactions')
        .delete()
        .eq('property_id', propertyId)
    })

    it('should include performance metrics', async () => {
      const request = makeRequest('/api/couples/mutual-likes')
      const response = await getMutualLikes(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.performance).toBeDefined()
      expect(typeof data.performance.totalTime).toBe('number')
      expect(typeof data.performance.cached).toBe('boolean')
    })

    it('should respect includeProperties=false parameter', async () => {
      // Create a property and mutual like
      const propertyId = await createTestProperty()
      await supabaseAdmin.from('user_property_interactions').insert([
        {
          user_id: testUserId,
          property_id: propertyId,
          household_id: testHouseholdId,
          interaction_type: 'like',
          created_at: new Date().toISOString(),
        },
        {
          user_id: partnerUserId,
          property_id: propertyId,
          household_id: testHouseholdId,
          interaction_type: 'like',
          created_at: new Date().toISOString(),
        },
      ])

      const request = makeRequest(
        '/api/couples/mutual-likes?includeProperties=false'
      )
      const response = await getMutualLikes(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // When includeProperties=false, property details should not be enriched
      // (the base mutual like data still includes property_id)
      if (data.mutualLikes.length > 0) {
        const mutualLike = data.mutualLikes[0]
        expect(mutualLike.property_id).toBeDefined()
        // property object should be null or undefined when not included
        expect(mutualLike.property).toBeUndefined()
      }

      // Clean up
      await supabaseAdmin
        .from('user_property_interactions')
        .delete()
        .eq('property_id', propertyId)
    })
  })
})
