import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, afterEach } from 'vitest'

import { GET } from '@/app/api/properties/vibes/route'
import type { Database } from '@/types/database'

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

const getFreshAuthToken = async (
  supabaseUrl: string,
  anonKey: string
): Promise<{ token: string; userId: string }> => {
  const supabase = createSupabaseClient<Database>(supabaseUrl, anonKey)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test1@example.com',
    password: 'testpassword123',
  })

  if (error || !data.session) {
    throw new Error(`Failed to get fresh auth token: ${error?.message}`)
  }

  return {
    token: data.session.access_token,
    userId: data.user.id,
  }
}

describe.sequential('Integration: /api/properties/vibes', () => {
  let supabaseAdmin: ReturnType<typeof createSupabaseClient<Database>>
  let authToken: string
  let createdPropertyIds: string[] = []

  beforeAll(async () => {
    const env = requireSupabaseEnv()
    supabaseAdmin = createSupabaseClient<Database>(
      env.supabaseUrl,
      env.serviceKey
    )

    const { token } = await getFreshAuthToken(env.supabaseUrl, env.anonKey)
    authToken = token
  })

  afterEach(async () => {
    if (createdPropertyIds.length) {
      await supabaseAdmin
        .from('property_vibes')
        .delete()
        .in('property_id', createdPropertyIds)
      await supabaseAdmin
        .from('properties')
        .delete()
        .in('id', createdPropertyIds)
      createdPropertyIds = []
    }
  })

  it('rejects unauthenticated requests', async () => {
    const res = await fetch('http://localhost:3000/api/properties/vibes')
    expect(res.status).toBe(401)
  })

  it('returns vibes for authenticated users', async () => {
    const propertyId = randomUUID()
    createdPropertyIds.push(propertyId)

    await supabaseAdmin.from('properties').upsert([
      {
        id: propertyId,
        address: 'Vibes Test',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1500,
        property_type: 'single_family',
        images: ['https://example.com/0.jpg'],
        listing_status: 'active',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])

    await supabaseAdmin.from('property_vibes').upsert([
      {
        property_id: propertyId,
        tagline: 'Test tagline',
        vibe_statement: 'Test statement',
        feature_highlights: [],
        lifestyle_fits: [],
        suggested_tags: ['Remote Work Ready'],
        emotional_hooks: ['hook'],
        primary_vibes: [{ name: 'x', intensity: 0.9, source: 'both' }],
        aesthetics: {
          lightingQuality: 'natural_abundant',
          colorPalette: ['warm gray'],
          architecturalStyle: 'Modern',
          overallCondition: 'well_maintained',
        },
        model_used: 'test-model',
        images_analyzed: ['https://example.com/0.jpg'],
        source_data_hash: 'hash',
        generation_cost_usd: 0.001,
        confidence: 0.8,
      },
    ])

    const req = new NextRequest(
      `http://localhost/api/properties/vibes?propertyId=${propertyId}`,
      {
        headers: { authorization: `Bearer ${authToken}` },
      }
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: any[] }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].property_id).toBe(propertyId)
    expect(body.data[0].tagline).toBe('Test tagline')
  })
})
