/**
 * Test User Management Utilities
 * Provides access to predefined test users created by setup scripts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Test users created by setup-test-users-admin.js
export const TEST_USERS = {
  USER_1: {
    email: process.env.TEST_USER_1_EMAIL || 'test1@example.com',
    password: process.env.TEST_USER_1_PASSWORD || 'testpassword123',
  },
  USER_2: {
    email: process.env.TEST_USER_2_EMAIL || 'test2@example.com',
    password: process.env.TEST_USER_2_PASSWORD || 'testpassword456',
  },
  // Worker users for parallel execution
  WORKER_0: {
    email: 'test-worker-0@example.com',
    password: 'testpassword123',
  },
  WORKER_1: {
    email: 'test-worker-1@example.com',
    password: 'testpassword123',
  },
  WORKER_2: {
    email: 'test-worker-2@example.com',
    password: 'testpassword123',
  },
  WORKER_3: {
    email: 'test-worker-3@example.com',
    password: 'testpassword123',
  },
  WORKER_4: {
    email: 'test-worker-4@example.com',
    password: 'testpassword123',
  },
  WORKER_5: {
    email: 'test-worker-5@example.com',
    password: 'testpassword123',
  },
  WORKER_6: {
    email: 'test-worker-6@example.com',
    password: 'testpassword123',
  },
  WORKER_7: {
    email: 'test-worker-7@example.com',
    password: 'testpassword123',
  },
}

export type TestUser = (typeof TEST_USERS)[keyof typeof TEST_USERS]

type TestSupabaseClient = SupabaseClient
type SignInResponse = Awaited<
  ReturnType<TestSupabaseClient['auth']['signInWithPassword']>
>
type AuthUser = NonNullable<SignInResponse['data']['user']>
type AuthSession = NonNullable<SignInResponse['data']['session']>

/**
 * Get all available test users as an array
 */
export function getAllTestUsers(): TestUser[] {
  return Object.values(TEST_USERS)
}

/**
 * Get a test user by index (0-9 available)
 */
export function getTestUser(index: number): TestUser {
  const users = getAllTestUsers()
  if (index < 0 || index >= users.length) {
    throw new Error(
      `Test user index ${index} out of range (0-${users.length - 1})`
    )
  }
  return users[index]
}

/**
 * Get multiple test users by indices
 */
export function getTestUsers(indices: number[]): TestUser[] {
  return indices.map((index) => getTestUser(index))
}

// Session cache to avoid repeated auth calls for the same user
const sessionCache = new Map<
  number,
  {
    supabase: TestSupabaseClient
    user: AuthUser
    session: AuthSession
    timestamp: number
  }
>()
const SESSION_TTL = 60000 // 1 minute TTL for cached sessions

/**
 * Create an authenticated Supabase client for a specific test user
 *
 * IMPORTANT: Each user gets a unique client instance via X-Test-User-Index header.
 * This ensures vitest's client caching doesn't share sessions between users.
 * Sessions are cached for 1 minute to avoid repeated auth calls.
 */
export async function createAuthenticatedClient(userIndex: number) {
  // Check cache first
  const cached = sessionCache.get(userIndex)
  if (cached && Date.now() - cached.timestamp < SESSION_TTL) {
    return {
      supabase: cached.supabase,
      user: cached.user,
      session: cached.session,
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'X-Test-User-Index': userIndex.toString(),
        },
      },
    }
  )

  const testUser = getTestUser(userIndex)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: testUser.email,
    password: testUser.password,
  })

  if (error) {
    throw new Error(
      `Failed to authenticate test user ${userIndex}: ${error.message}`
    )
  }

  // Cache the session
  sessionCache.set(userIndex, {
    supabase,
    user: data.user!,
    session: data.session!,
    timestamp: Date.now(),
  })

  return { supabase, user: data.user, session: data.session }
}

/**
 * Get user profile data for a test user (assumes profiles exist)
 */
export async function getTestUserProfile(userIndex: number) {
  const { supabase, user } = await createAuthenticatedClient(userIndex)

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error(
      `Failed to get profile for test user ${userIndex}: ${error.message}`
    )
  }

  return { profile, user, supabase }
}

/**
 * Helper to clean up test data for specific users (use carefully)
 */
export async function cleanupTestUserData(userIndices: number[]) {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  for (const userIndex of userIndices) {
    const testUser = getTestUser(userIndex)

    // Get user ID by email
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users?.find((u) => u.email === testUser.email)

    if (user) {
      // Clean up user-related data using CASCADE DELETE from FK constraints
      await supabase
        .from('user_property_interactions')
        .delete()
        .eq('user_id', user.id)

      await supabase.from('household_members').delete().eq('user_id', user.id)
    }
  }
}

/**
 * Wait for test user profiles to be created by triggers
 */
export async function waitForUserProfiles(userIds: string[], timeoutMs = 5000) {
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id')
      .in('id', userIds)

    if (profiles && profiles.length === userIds.length) {
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error(
    `Timeout waiting for user profiles to be created after ${timeoutMs}ms`
  )
}
