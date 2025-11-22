import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

describe('Supabase RPC Shape - Integration', () => {
  let client: ReturnType<typeof createClient<Database>>

  beforeAll(() => {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase RPC env configuration')
    }

    client = createClient<Database>(supabaseUrl, anonKey)
  })

  it('returns expected shape from get_user_interaction_summary', async () => {
    const testUserId = process.env.TEST_AUTH_TOKEN
      ? JSON.parse(
          Buffer.from(
            process.env.TEST_AUTH_TOKEN.split('.')[1],
            'base64'
          ).toString()
        ).sub
      : undefined

    expect(testUserId).toBeTruthy()

    const { data, error } = await client.rpc('get_user_interaction_summary', {
      p_user_id: testUserId,
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
    const rows = data as { interaction_type: string; count: number }[]
    rows.forEach((row) => {
      expect(typeof row.interaction_type).toBe('string')
      expect(typeof row.count).toBe('number')
    })
  })

  it('get_household_mutual_likes returns objects with required fields', async () => {
    const { data, error } = await client.rpc('get_household_mutual_likes', {
      p_household_id: '00000000-0000-0000-0000-000000000000',
    })

    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    const rows = data as any[]
    rows.forEach((row) => {
      expect(row).toHaveProperty('property_id')
      expect(row).toHaveProperty('liked_by_count')
      expect(row).toHaveProperty('user_ids')
    })
  })

  it('returns error details for invalid RPC inputs', async () => {
    const { error } = await client.rpc('calculate_distance', {
      lat1: 999,
      long1: 999,
      lat2: 999,
      long2: 999,
    })

    expect(error).toBeDefined()
  })
})
