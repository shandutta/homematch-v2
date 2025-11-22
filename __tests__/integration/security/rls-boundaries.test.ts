import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

import type { Database } from '@/types/database'

describe('RLS Boundaries - Integration', () => {
  let anonClient: ReturnType<typeof createClient<Database>>
  let authClient: ReturnType<typeof createClient<Database>>
  let serviceClient: ReturnType<typeof createClient<Database>>

  const expectEnv = () => {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const token = process.env.TEST_AUTH_TOKEN

    if (!supabaseUrl || !anonKey || !serviceKey || !token) {
      throw new Error('Missing Supabase env for RLS tests')
    }

    return { supabaseUrl, anonKey, serviceKey, token }
  }

  beforeAll(() => {
    const { supabaseUrl, anonKey, serviceKey, token } = expectEnv()
    anonClient = createClient<Database>(supabaseUrl, anonKey)
    serviceClient = createClient<Database>(supabaseUrl, serviceKey)
    authClient = createClient<Database>(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })
  })

  it('prevents anon read of protected household data', async () => {
    const { data, error } = await anonClient
      .from('user_profiles')
      .select('household_id')
      .limit(1)
    expect(error).toBeNull()
    expect(data ?? []).toEqual([])
  })

  it('prevents authenticated user from reading another household interactions', async () => {
    const otherHousehold = randomUUID()
    const foreignUser = randomUUID()
    // Seed a foreign interaction with service role
    await serviceClient.from('user_property_interactions').insert({
      user_id: foreignUser,
      property_id: randomUUID(),
      household_id: otherHousehold,
      interaction_type: 'like',
    })

    const { data, error } = await authClient
      .from('user_property_interactions')
      .select('household_id')
      .eq('household_id', otherHousehold)

    // RLS should block the row
    expect(error).toBeNull()
    expect(data).toEqual([])

    // Cleanup
    await serviceClient
      .from('user_property_interactions')
      .delete()
      .eq('household_id', otherHousehold)
  })

  it('prevents authenticated user from updating another household record', async () => {
    const foreignProfileId = randomUUID()

    await serviceClient.from('user_profiles').upsert({
      id: foreignProfileId,
    })

    const { error, data } = await authClient
      .from('user_profiles')
      .update({ preferences: { bedrooms: 9 } })
      .eq('id', foreignProfileId)
      .select()

    expect(error?.code === '42501' || (data ?? []).length === 0).toBe(true)

    await serviceClient
      .from('user_profiles')
      .delete()
      .eq('id', foreignProfileId)
  })

  it('allows service role to bypass RLS for maintenance tasks', async () => {
    const { error } = await serviceClient
      .from('user_profiles')
      .select('id')
      .limit(1)
    expect(error).toBeNull()
  })
})
