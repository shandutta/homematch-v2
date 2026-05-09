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

    if (!supabaseUrl || !anonKey || !serviceKey) {
      throw new Error('Missing Supabase env for RLS tests')
    }

    return { supabaseUrl, anonKey, serviceKey }
  }

  beforeAll(async () => {
    const { supabaseUrl, anonKey, serviceKey } = expectEnv()
    anonClient = createClient<Database>(supabaseUrl, anonKey)
    serviceClient = createClient<Database>(supabaseUrl, serviceKey)

    // Sign in as a test user to get a valid auth token. This avoids relying on
    // a pre-generated TEST_AUTH_TOKEN file that may not exist in all environments.
    const tempClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    })
    const { data: { session }, error: signInError } =
      await tempClient.auth.signInWithPassword({
        email: process.env.TEST_USER_2_EMAIL || 'test-worker-2@example.com',
        password: process.env.TEST_USER_2_PASSWORD || 'testpassword123',
      })

    if (signInError || !session?.access_token) {
      throw new Error(
        `Could not authenticate test user for RLS boundary tests: ${signInError?.message ?? 'no session'}`
      )
    }

    authClient = createClient<Database>(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    })
  })

  it('prevents anon read of protected household data', async () => {
    // Insert a test profile via service role, then verify anon cannot read it
    const testUserId = randomUUID()
    await serviceClient.from('user_profiles').upsert({
      id: testUserId,
    })

    // Anon should NOT be able to read this specific profile
    const { data, error } = await anonClient
      .from('user_profiles')
      .select('id')
      .eq('id', testUserId)

    expect(error).toBeNull()
    // RLS blocks anon from reading authenticated users' data
    expect(data ?? []).toEqual([])

    // Cleanup
    await serviceClient
      .from('user_profiles')
      .delete()
      .eq('id', testUserId)
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
