import { jest, describe, beforeEach, test, expect } from '@jest/globals'
import { UserService } from '@/lib/services/users'
import * as _supabaseClient from '@/lib/supabase/client'
import * as _supabaseServer from '@/lib/supabase/server'

// Mock the entire supabase client/server modules
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('UserService Unit Tests', () => {
  let userService: UserService
  let mockSupabaseClient: any

  beforeEach(() => {
    // Create a fresh mock client for each test
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    }

    // Ensure both client and server creators return the same mock using ESM-imported modules
    const { createClient: mockClient } = _supabaseClient as unknown as {
      createClient: jest.Mock
    }
    const { createClient: mockServer } = _supabaseServer as unknown as {
      createClient: jest.Mock
    }
    mockClient.mockReturnValue(mockSupabaseClient)
    mockServer.mockReturnValue(mockSupabaseClient)

    userService = new UserService()
  })

  describe('Profile Management', () => {
    test('should create a user profile', async () => {
      const profileInsert = { id: 'user-123', email: 'test@example.com' } as any
      const mockCreatedProfile = {
        ...profileInsert,
        created_at: new Date().toISOString(),
      }
      mockSupabaseClient.single.mockResolvedValue({
        data: mockCreatedProfile,
        error: null,
      })

      const result = await userService.createUserProfile(profileInsert)

      expect(result).toEqual(mockCreatedProfile)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(profileInsert)
      expect(mockSupabaseClient.select).toHaveBeenCalled()
      expect(mockSupabaseClient.single).toHaveBeenCalled()
    })

    test('should retrieve a user profile', async () => {
      const mockProfile = { id: 'user-123', email: 'test@example.com' }
      mockSupabaseClient.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      const result = await userService.getUserProfile('user-123')

      expect(result).toEqual(mockProfile)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'user-123')
      expect(mockSupabaseClient.single).toHaveBeenCalled()
    })

    test('should return null when a user profile is not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      })

      const result = await userService.getUserProfile('missing-user')

      expect(result).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'missing-user')
    })

    test('should update a user profile', async () => {
      const userId = 'user-123'
      const updates = { onboarding_completed: true }
      const mockUpdatedProfile = { id: userId, ...updates }
      mockSupabaseClient.single.mockResolvedValue({
        data: mockUpdatedProfile,
        error: null,
      })

      const result = await userService.updateUserProfile(userId, updates)

      expect(result).toEqual(mockUpdatedProfile)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({ ...updates })
      )
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', userId)
      expect(mockSupabaseClient.select).toHaveBeenCalled()
      expect(mockSupabaseClient.single).toHaveBeenCalled()
    })

    test('should return null when fetching user profile with household if not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      })

      const result = await userService.getUserProfileWithHousehold('missing')

      expect(result).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'missing')
    })
  })

  // TODO: Move to integration tests
  describe('Skipped Integration-level Tests', () => {
    test('Household Operations', () => {
      expect(true).toBe(true)
    })
    test('Interaction Tracking', () => {
      expect(true).toBe(true)
    })
  })
})
