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
    await supabaseAdmin
      .from('user_property_interactions')
      .delete()
      .eq('user_id', testUserId)
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

    expect(summary.liked).toBe(2)
    expect(summary.passed).toBeGreaterThanOrEqual(1)
    expect(summary.viewed).toBe(0)

    const firstPageRes = await GET(
      new NextRequest('http://localhost/api/interactions?type=liked&limit=1')
    )
    expect(firstPageRes.status).toBe(200)
    const firstPage = await firstPageRes.json()

    expect(firstPage.items).toHaveLength(1)
    expect(firstPage.nextCursor).toBeTruthy()
    const firstPropertyId = firstPage.items[0].id
    expect(likedPropertyIds).toContain(firstPropertyId)

    const secondPageRes = await GET(
      new NextRequest(
        `http://localhost/api/interactions?type=liked&limit=1&cursor=${encodeURIComponent(firstPage.nextCursor)}`
      )
    )
    expect(secondPageRes.status).toBe(200)
    const secondPage = await secondPageRes.json()

    expect(secondPage.items).toHaveLength(1)
    expect(secondPage.nextCursor).toBeNull()
    const returnedIds = [firstPropertyId, secondPage.items[0].id].sort()
    expect(returnedIds).toEqual([...likedPropertyIds].sort())
  })

  it('deletes interactions for the authenticated user', async () => {
    const propertyId = await createTestProperty()
    const createRes = await POST(
      makeJsonRequest('http://localhost/api/interactions', 'POST', {
        propertyId,
        type: 'liked',
      })
    )
    expect(createRes.status).toBe(200)

    const deleteRes = await DELETE(
      makeJsonRequest('http://localhost/api/interactions', 'DELETE', {
        propertyId,
      })
    )
    expect(deleteRes.status).toBe(200)

    const { data } = await supabaseAdmin
      .from('user_property_interactions')
      .select('id')
      .eq('user_id', testUserId)
      .eq('property_id', propertyId)

    expect(data ?? []).toHaveLength(0)
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
})
