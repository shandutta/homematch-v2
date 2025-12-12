/**
 * Integration Tests for UserService
 *
 * Tests actual database operations against a real Supabase instance.
 * Note: user_profiles has a foreign key to auth.users, so we test
 * read operations and updates on existing users rather than creating new ones.
 */

import { createClient } from '@supabase/supabase-js'
import { UserService } from '@/lib/services/users'
import type { Database } from '@/types/database'
import { describe, test, expect, beforeAll } from 'vitest'

describe('UserService Integration Tests', () => {
  let userService: UserService
  let supabase: ReturnType<typeof createClient<Database>>
  let existingUserId: string | null = null

  beforeAll(async () => {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54200'
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseKey) {
      throw new Error('Missing Supabase key for integration tests')
    }

    console.log('Running UserService integration tests with real Supabase')

    supabase = createClient<Database>(supabaseUrl, supabaseKey)

    const clientFactory = {
      createClient: async () => supabase,
    }

    userService = new UserService(clientFactory)

    // Find an existing user to test with
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)

    if (users && users.length > 0) {
      existingUserId = users[0].id
      console.log('Found existing user for testing:', existingUserId)
    }
  })

  describe('Profile Read Operations', () => {
    test('should retrieve a user profile by ID', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      const result = await userService.getUserProfile(existingUserId)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(existingUserId)
    })

    test('should return null for non-existent user profile', async () => {
      const result = await userService.getUserProfile(
        '00000000-0000-0000-0000-000000000000'
      )
      expect(result).toBeNull()
    })

    test('should retrieve user profile with household data', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      const result =
        await userService.getUserProfileWithHousehold(existingUserId)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(existingUserId)
      // household could be null if user doesn't have one
    })

    test('should return null for non-existent user with household query', async () => {
      const result = await userService.getUserProfileWithHousehold(
        '00000000-0000-0000-0000-000000000000'
      )
      expect(result).toBeNull()
    })
  })

  describe('Profile Update Operations', () => {
    test('should update an existing user profile', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      // Get current state
      const original = await userService.getUserProfile(existingUserId)
      expect(original).not.toBeNull()

      // Update with a test value
      const testValue = !original?.onboarding_completed

      const updated = await userService.updateUserProfile(existingUserId, {
        onboarding_completed: testValue,
      })

      expect(updated).not.toBeNull()
      expect(updated?.onboarding_completed).toBe(testValue)

      // Restore original value
      await userService.updateUserProfile(existingUserId, {
        onboarding_completed: original?.onboarding_completed ?? false,
      })
    })

    test('should return null when updating non-existent profile', async () => {
      const result = await userService.updateUserProfile(
        '00000000-0000-0000-0000-000000000000',
        { full_name: 'Does Not Exist' }
      )

      expect(result).toBeNull()
    })
  })

  describe('Household Operations', () => {
    test('should query users by household', async () => {
      // Find a household with users
      const { data: households } = await supabase
        .from('households')
        .select('id')
        .limit(1)

      if (!households || households.length === 0) {
        console.log('Skipping: no households found')
        return
      }

      const householdId = households[0].id

      // Query users in that household
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, email, household_id')
        .eq('household_id', householdId)

      expect(Array.isArray(users)).toBe(true)
      users?.forEach((user) => {
        expect(user.household_id).toBe(householdId)
      })
    })
  })

  describe('Service Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Query with invalid UUID format should be handled
      const result = await userService.getUserProfile('invalid-uuid-format')

      // Should return null, not throw
      expect(result).toBeNull()
    })
  })
})
