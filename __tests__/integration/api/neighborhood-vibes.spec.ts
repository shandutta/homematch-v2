import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, afterEach } from 'vitest'

import { GET } from '@/app/api/neighborhoods/vibes/route'
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
): Promise<string> => {
  const supabase = createSupabaseClient<Database>(supabaseUrl, anonKey)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test1@example.com',
    password: 'testpassword123',
  })

  if (error || !data.session) {
    throw new Error(`Failed to get fresh auth token: ${error?.message}`)
  }

  return data.session.access_token
}

describe.sequential('Integration: /api/neighborhoods/vibes', () => {
  let supabaseAdmin: ReturnType<typeof createSupabaseClient<Database>>
  let authToken: string
  let createdNeighborhoodIds: string[] = []

  beforeAll(async () => {
    const env = requireSupabaseEnv()
    supabaseAdmin = createSupabaseClient<Database>(
      env.supabaseUrl,
      env.serviceKey
    )
    authToken = await getFreshAuthToken(env.supabaseUrl, env.anonKey)
  })

  afterEach(async () => {
    if (createdNeighborhoodIds.length) {
      await supabaseAdmin
        .from('neighborhood_vibes')
        .delete()
        .in('neighborhood_id', createdNeighborhoodIds)
      await supabaseAdmin
        .from('neighborhoods')
        .delete()
        .in('id', createdNeighborhoodIds)
      createdNeighborhoodIds = []
    }
  })

  it('rejects unauthenticated requests', async () => {
    const res = await fetch('http://localhost:3000/api/neighborhoods/vibes')
    expect(res.status).toBe(401)
  })

  it('returns vibes for authenticated users', async () => {
    const neighborhoodId = randomUUID()
    createdNeighborhoodIds.push(neighborhoodId)

    await supabaseAdmin.from('neighborhoods').upsert([
      {
        id: neighborhoodId,
        name: 'Neighborhood Vibes Test',
        city: 'Test City',
        state: 'TS',
        metro_area: 'Test Metro',
        walk_score: 90,
        transit_score: 75,
        median_price: 1200000,
      },
    ])

    await supabaseAdmin.from('neighborhood_vibes').upsert([
      {
        neighborhood_id: neighborhoodId,
        tagline: 'Test neighborhood tagline',
        vibe_statement:
          'A calm, walkable pocket with easy access to daily essentials.',
        neighborhood_themes: [
          {
            name: 'Walkable Everyday',
            whyItMatters: 'Errands and cafes stay within a short stroll.',
            intensity: 0.8,
          },
          {
            name: 'Transit Friendly',
            whyItMatters: 'Quick access to bus and rail options.',
            intensity: 0.7,
          },
        ],
        local_highlights: [
          {
            name: 'Neighborhood cafe strip',
            category: 'Food & Drink',
            whyItMatters: 'Great for morning routines and meetups.',
          },
          {
            name: 'Pocket park',
            category: 'Outdoors',
            whyItMatters: 'A quick green break nearby.',
          },
        ],
        resident_fits: [
          {
            profile: 'City Explorer',
            reason: 'Easy access to dining and culture.',
          },
          {
            profile: 'Car-light Commuter',
            reason: 'Transit keeps commuting flexible.',
          },
        ],
        suggested_tags: ['Walkable', 'Transit Ready', 'Local Gems'],
        model_used: 'test-model',
        source_data_hash: 'hash',
        generation_cost_usd: 0.001,
        confidence: 0.8,
      },
    ])

    const req = new NextRequest(
      `http://localhost/api/neighborhoods/vibes?neighborhoodId=${neighborhoodId}`,
      {
        headers: { authorization: `Bearer ${authToken}` },
      }
    )

    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: any[] }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].neighborhood_id).toBe(neighborhoodId)
    expect(body.data[0].tagline).toBe('Test neighborhood tagline')
  })
})
