/**
 * Integration tests for the create_household_for_user RPC function
 *
 * This tests the SECURITY DEFINER function that creates households
 * and atomically updates user profiles.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54200'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

describe('create_household_for_user RPC', () => {
  let serviceClient: ReturnType<typeof createClient>
  let testUserId: string
  let testUserEmail: string
  let testUserPassword: string
  let createdHouseholdId: string | null = null

  beforeAll(async () => {
    if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be set'
      )
    }

    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // Create a test user for this test suite
    testUserEmail = `household-rpc-test-${Date.now()}@example.com`
    testUserPassword = 'TestPassword123!'

    const { data: authData, error: authError } =
      await serviceClient.auth.admin.createUser({
        email: testUserEmail,
        password: testUserPassword,
        email_confirm: true,
      })

    if (authError) throw authError
    testUserId = authData.user.id

    // Wait for trigger to create user_profile
    await new Promise((resolve) => setTimeout(resolve, 500))
  })

  afterAll(async () => {
    // Clean up: delete created household and user
    if (createdHouseholdId) {
      // First clear household_id from user profile
      await serviceClient
        .from('user_profiles')
        .update({ household_id: null })
        .eq('id', testUserId)

      // Then delete the household
      await serviceClient
        .from('households')
        .delete()
        .eq('id', createdHouseholdId)
    }

    // Delete test user
    if (testUserId) {
      await serviceClient.auth.admin.deleteUser(testUserId)
    }
  })

  it('should create household and update user profile atomically', async () => {
    // Create authenticated client for test user
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })

    // Sign in as test user
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: testUserEmail,
      password: testUserPassword,
    })
    expect(signInError).toBeNull()

    // Verify user has no household initially
    const { data: profileBefore } = await anonClient
      .from('user_profiles')
      .select('household_id')
      .eq('id', testUserId)
      .single()

    expect(profileBefore?.household_id).toBeNull()

    // Call the RPC function
    const { data: householdId, error: rpcError } = await anonClient.rpc(
      'create_household_for_user',
      { p_name: null }
    )

    expect(rpcError).toBeNull()
    expect(householdId).toBeTruthy()
    expect(typeof householdId).toBe('string')

    createdHouseholdId = householdId

    // Verify household was created
    const { data: household } = await serviceClient
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single()

    expect(household).toBeTruthy()
    expect(household?.created_by).toBe(testUserId)
    expect(household?.user_count).toBe(1)

    // Verify user profile was updated
    const { data: profileAfter } = await anonClient
      .from('user_profiles')
      .select('household_id')
      .eq('id', testUserId)
      .single()

    expect(profileAfter?.household_id).toBe(householdId)

    await anonClient.auth.signOut()
  })

  it('should reject unauthenticated calls', async () => {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })

    // Don't sign in - call RPC as anonymous
    const { data, error } = await anonClient.rpc('create_household_for_user', {
      p_name: null,
    })

    expect(data).toBeNull()
    expect(error).toBeTruthy()
    expect(error?.message).toContain('Not authenticated')
  })

  it('should reject if user already has a household', async () => {
    // User already has household from previous test
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })

    await anonClient.auth.signInWithPassword({
      email: testUserEmail,
      password: testUserPassword,
    })

    // Try to create another household
    const { data, error } = await anonClient.rpc('create_household_for_user', {
      p_name: null,
    })

    expect(data).toBeNull()
    expect(error).toBeTruthy()
    expect(error?.message).toContain('already belongs to a household')

    await anonClient.auth.signOut()
  })
})
