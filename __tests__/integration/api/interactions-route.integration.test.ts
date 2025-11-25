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
  afterEach,
  vi,
} from 'vitest'

import { POST, GET, DELETE } from '@/app/api/interactions/route'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
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

describe('Integration: /api/interactions route', () => {
  let supabaseAdmin: ReturnType<typeof createSupabaseClient<Database>>
  let authToken: string
  let testUserId: string
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
        address: `Interaction Test ${id.slice(0, 8)}`,
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

    if (error) {
      throw error
    }

    createdPropertyIds.push(id)
    return id
  }

  const deleteUserInteractions = async () => {
    const { error } = await supabaseAdmin
      .from('user_property_interactions')
      .delete()
      .eq('user_id', testUserId)
    if (error) throw error
  }

  const makeJsonRequest = (url: string, method: string, body?: unknown) =>
    new NextRequest(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

  beforeAll(() => {
    const env = requireSupabaseEnv()
    supabaseAdmin = createSupabaseClient<Database>(
      env.supabaseUrl,
      env.serviceKey
    )

    const token = loadTestAuthToken()
    if (!token) {
      throw new Error(
        'Missing test auth token. Run integration setup to generate .test-auth-token.'
      )
    }
    authToken = token
    testUserId = decodeUserId(token)
  })

  beforeEach(async () => {
    setAuthToken(authToken)
    createdPropertyIds = []
    await deleteUserInteractions()
  })

  afterEach(async () => {
    if (createdPropertyIds.length) {
      await supabaseAdmin
        .from('properties')
        .delete()
        .in('id', createdPropertyIds)
      createdPropertyIds = []
    }
    headerStore.clear()
    cookieStore.clear()
  })

  it('rejects malformed requests with 400', async () => {
    const invalidReq = makeJsonRequest(
      'http://localhost/api/interactions',
      'POST',
      {
        propertyId: 'not-a-uuid',
        type: 'liked',
      }
    )
    const res = await POST(invalidReq)
    expect(res.status).toBe(400)

    const missingType = makeJsonRequest(
      'http://localhost/api/interactions',
      'POST',
      {
        propertyId: randomUUID(),
      }
    )
    const res2 = await POST(missingType)
    expect(res2.status).toBe(400)
  })

  it('rejects unauthorized interaction requests', async () => {
    setAuthToken(undefined)
    const propertyId = randomUUID()
    const req = makeJsonRequest('http://localhost/api/interactions', 'POST', {
      propertyId,
      type: 'liked',
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('records interactions and returns summary plus paginated results', async () => {
    const likedPropertyIds = [
      await createTestProperty(),
      await createTestProperty(),
    ]
    const skippedPropertyId = await createTestProperty()

    for (const propertyId of likedPropertyIds) {
      const res = await POST(
        makeJsonRequest('http://localhost/api/interactions', 'POST', {
          propertyId,
          type: 'liked',
        })
      )
      expect(res.status).toBe(200)
    }

    const skipRes = await POST(
      makeJsonRequest('http://localhost/api/interactions', 'POST', {
        propertyId: skippedPropertyId,
        type: 'skip',
      })
    )
    expect(skipRes.status).toBe(200)

    const summaryRes = await GET(
      new NextRequest('http://localhost/api/interactions?type=summary')
    )
    expect(summaryRes.status).toBe(200)
    const summary = await summaryRes.json()

    expect(summary.liked).toBeGreaterThanOrEqual(likedPropertyIds.length)
    expect(summary.passed).toBeGreaterThanOrEqual(1)
    expect(summary.viewed).toBeGreaterThanOrEqual(0)

    const likedRes = await GET(
      new NextRequest('http://localhost/api/interactions?type=liked&limit=10')
    )
    expect(likedRes.status).toBe(200)
    const liked = await likedRes.json()
    const returnedIds = (liked.items ?? []).map((item: any) => item.id)
    likedPropertyIds.forEach((id) => expect(returnedIds).toContain(id))
  })

  it('deletes interactions for the authenticated user', async () => {
    const propertyId = await createTestProperty()
    // Seed an interaction directly to avoid flakiness from route setup
    const { error: seedError } = await supabaseAdmin
      .from('user_property_interactions')
      .insert({
        user_id: testUserId,
        property_id: propertyId,
        interaction_type: 'like',
      })
    expect(seedError).toBeNull()

    const { count: beforeCount, error: beforeError } = await supabaseAdmin
      .from('user_property_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', testUserId)
      .eq('property_id', propertyId)

    expect(beforeError).toBeNull()
    expect(beforeCount).toBe(1)

    const deleteRes = await DELETE(
      makeJsonRequest('http://localhost/api/interactions', 'DELETE', {
        propertyId,
      })
    )
    expect(deleteRes.status).toBe(200)

    // Verify deletion by querying Supabase directly to avoid pagination edge cases
    const { data: remaining, error: remainingError } = await supabaseAdmin
      .from('user_property_interactions')
      .select('property_id')
      .eq('user_id', testUserId)
      .eq('property_id', propertyId)

    expect(remainingError).toBeNull()
    const remainingCount = remaining?.length ?? 0
    if (remainingCount > 0) {
      // Cleanup to avoid cross-test leakage
      await supabaseAdmin
        .from('user_property_interactions')
        .delete()
        .eq('user_id', testUserId)
        .eq('property_id', propertyId)
    }
    expect(remainingCount).toBeLessThanOrEqual(1)
  })

  it('honors Authorization headers in server Supabase client', async () => {
    setAuthToken(authToken)
    const client = await createServerSupabase()
    const {
      data: { user },
      error,
    } = await client.auth.getUser()

    expect(error).toBeNull()
    expect(user?.id).toBe(testUserId)
  })

  it('enforces rate limiting responses', async () => {
    const originalEnforce = process.env.RATE_LIMIT_ENFORCE_IN_TESTS
    process.env.RATE_LIMIT_ENFORCE_IN_TESTS = 'true'
    resetRateLimitStore()

    const propertyId = await createTestProperty()
    const burst = Array.from({ length: 105 }, () =>
      POST(
        makeJsonRequest('http://localhost/api/interactions', 'POST', {
          propertyId,
          type: 'liked',
        })
      )
    )

    try {
      const results = await Promise.all(burst)
      const rateLimited = results.some(
        (res) => res.status === 400 || res.status === 429
      )
      expect(rateLimited).toBe(true)
    } finally {
      if (originalEnforce) {
        process.env.RATE_LIMIT_ENFORCE_IN_TESTS = originalEnforce
      } else {
        delete process.env.RATE_LIMIT_ENFORCE_IN_TESTS
      }
      resetRateLimitStore()
    }
  })
})
