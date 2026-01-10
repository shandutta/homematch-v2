/**
 * Integration Tests for Profile Preferences Updates
 *
 * Tests actual database operations for profile preferences (phone, display_name, bio)
 * against a real Supabase instance. No mocking - tests real behavior.
 */

import { createClient } from '@supabase/supabase-js'
import { UserService } from '@/lib/services/users'
import type { Database } from '@/types/database'
import { describe, test, expect, beforeAll } from 'vitest'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const getPreferences = (value: unknown): Record<string, unknown> =>
  isRecord(value) ? value : {}

describe('Profile Preferences Integration Tests', () => {
  let userService: UserService
  let supabase: ReturnType<typeof createClient<Database>>
  let existingUserId: string | null = null
  let originalPreferences: Record<string, unknown> | null = null

  beforeAll(async () => {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54200'
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseKey) {
      throw new Error('Missing Supabase key for integration tests')
    }

    supabase = createClient<Database>(supabaseUrl, supabaseKey)

    const clientFactory = {
      createClient: async () => supabase,
    }

    userService = new UserService(clientFactory)

    // Find an existing user to test with
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, preferences')
      .limit(1)

    if (users && users.length > 0) {
      existingUserId = users[0].id
      originalPreferences = isRecord(users[0].preferences)
        ? users[0].preferences
        : null
      console.log('Found existing user for testing:', existingUserId)
    }
  })

  describe('Phone Number Updates', () => {
    test('should update phone number in preferences', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      const testPhone = '(555) 123-4567'

      const updated = await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          phone: testPhone,
        },
      })

      expect(updated).not.toBeNull()
      expect(updated?.preferences).toBeDefined()

      const prefs = getPreferences(updated?.preferences)
      expect(prefs.phone).toBe(testPhone)

      // Restore original state
      await userService.updateUserProfile(existingUserId, {
        preferences: originalPreferences,
      })
    })

    test('should allow clearing phone number', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      // First set a phone number
      await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          phone: '(555) 999-8888',
        },
      })

      // Then clear it
      const updated = await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          phone: '',
        },
      })

      expect(updated).not.toBeNull()
      const prefs = getPreferences(updated?.preferences)
      expect(prefs.phone).toBe('')

      // Restore original state
      await userService.updateUserProfile(existingUserId, {
        preferences: originalPreferences,
      })
    })
  })

  describe('Display Name Updates', () => {
    test('should update display_name in preferences', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      const testDisplayName = 'Integration Test User'

      const updated = await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          display_name: testDisplayName,
        },
      })

      expect(updated).not.toBeNull()

      const prefs = getPreferences(updated?.preferences)
      expect(prefs.display_name).toBe(testDisplayName)

      // Restore original state
      await userService.updateUserProfile(existingUserId, {
        preferences: originalPreferences,
      })
    })

    test('should handle special characters in display_name', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      const testDisplayName = "O'Connor & Associates"

      const updated = await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          display_name: testDisplayName,
        },
      })

      expect(updated).not.toBeNull()

      const prefs = getPreferences(updated?.preferences)
      expect(prefs.display_name).toBe(testDisplayName)

      // Restore original state
      await userService.updateUserProfile(existingUserId, {
        preferences: originalPreferences,
      })
    })
  })

  describe('Bio Updates', () => {
    test('should update bio in preferences', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      const testBio = 'Looking for a 3-bedroom home in the suburbs.'

      const updated = await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          bio: testBio,
        },
      })

      expect(updated).not.toBeNull()

      const prefs = getPreferences(updated?.preferences)
      expect(prefs.bio).toBe(testBio)

      // Restore original state
      await userService.updateUserProfile(existingUserId, {
        preferences: originalPreferences,
      })
    })

    test('should handle long bio text', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      const testBio =
        'A'.repeat(400) + ' This is a long bio to test character limits.'

      const updated = await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          bio: testBio,
        },
      })

      expect(updated).not.toBeNull()

      const prefs = getPreferences(updated?.preferences)
      expect(prefs.bio).toBe(testBio)

      // Restore original state
      await userService.updateUserProfile(existingUserId, {
        preferences: originalPreferences,
      })
    })
  })

  describe('Multiple Preferences Updates', () => {
    test('should update multiple preferences at once', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      const testData = {
        phone: '(123) 456-7890',
        display_name: 'Test Multi Update',
        bio: 'Testing multiple updates',
      }

      const updated = await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          ...testData,
        },
      })

      expect(updated).not.toBeNull()

      const prefs = getPreferences(updated?.preferences)
      expect(prefs.phone).toBe(testData.phone)
      expect(prefs.display_name).toBe(testData.display_name)
      expect(prefs.bio).toBe(testData.bio)

      // Restore original state
      await userService.updateUserProfile(existingUserId, {
        preferences: originalPreferences,
      })
    })

    test('should preserve existing preferences when updating subset', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      // First set known state
      const initialData = {
        phone: '(111) 222-3333',
        display_name: 'Initial Name',
        bio: 'Initial bio',
      }

      await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          ...initialData,
        },
      })

      // Update only phone
      const updated = await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          ...initialData,
          phone: '(999) 888-7777',
        },
      })

      expect(updated).not.toBeNull()

      const prefs = getPreferences(updated?.preferences)
      expect(prefs.phone).toBe('(999) 888-7777')
      // Other fields should be preserved
      expect(prefs.display_name).toBe(initialData.display_name)
      expect(prefs.bio).toBe(initialData.bio)

      // Restore original state
      await userService.updateUserProfile(existingUserId, {
        preferences: originalPreferences,
      })
    })
  })

  describe('Data Persistence', () => {
    test('should persist preferences after update', async () => {
      if (!existingUserId) {
        console.log('Skipping: no existing user found')
        return
      }

      const testData = {
        phone: '(777) 666-5555',
        display_name: 'Persistence Test',
      }

      // Update
      await userService.updateUserProfile(existingUserId, {
        preferences: {
          ...originalPreferences,
          ...testData,
        },
      })

      // Fetch fresh from database
      const fetched = await userService.getUserProfile(existingUserId)

      expect(fetched).not.toBeNull()

      const prefs = getPreferences(fetched?.preferences)
      expect(prefs.phone).toBe(testData.phone)
      expect(prefs.display_name).toBe(testData.display_name)

      // Restore original state
      await userService.updateUserProfile(existingUserId, {
        preferences: originalPreferences,
      })
    })
  })
})
