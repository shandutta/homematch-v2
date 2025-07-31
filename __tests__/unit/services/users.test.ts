import { UserService } from '@/lib/services/users'
import {
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  Household,
  HouseholdInsert,
  HouseholdUpdate,
  UserPropertyInteraction,
  UserPropertyInteractionInsert,
  SavedSearch,
  SavedSearchInsert,
  SavedSearchUpdate,
} from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Mock the server client module
jest.mock('@/lib/supabase/server')

describe('UserService Unit Tests', () => {
  let userService: UserService
  let mockCreateClient: jest.Mock

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()

    // Get the mocked createClient function
    const serverModule = require('@/lib/supabase/server')
    mockCreateClient = serverModule.createClient

    userService = new UserService()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Profile Management', () => {
    describe('createUserProfile', () => {
      test('should create user profile with proper validation', async () => {
        const profileInsert: UserProfileInsert = {
          id: 'user-123',
          preferences: {
            search_preferences: {
              price_min: 200000,
              price_max: 800000,
              bedrooms_min: 2,
              property_types: ['house', 'condo'],
            },
            notification_settings: {
              email_enabled: true,
              frequency: 'daily',
            },
          },
        }

        const mockCreatedProfile: UserProfile = {
          ...profileInsert,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          household_id: null,
          onboarding_completed: false,
        }

        // Set up the working mock pattern
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockCreatedProfile,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockInsert = jest.fn().mockReturnValue({ select: mockSelect })
        const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.createUserProfile(profileInsert)

        expect(mockFrom).toHaveBeenCalledWith('user_profiles')
        expect(mockInsert).toHaveBeenCalledWith(profileInsert)
        expect(mockSelect).toHaveBeenCalled()
        expect(result).toEqual(mockCreatedProfile)
      })

      test('should handle profile creation errors', async () => {
        const profileInsert: UserProfileInsert = {
          id: 'invalid-user',
        }

        // Set up the working mock pattern for error case
        const mockSingle = jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile creation failed' },
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockInsert = jest.fn().mockReturnValue({ select: mockSelect })
        const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.createUserProfile(profileInsert)

        expect(result).toBeNull()
      })
    })

    describe('updateUserProfile', () => {
      test('should update user preferences with JSONB operations', async () => {
        const profileUpdate: UserProfileUpdate = {
          preferences: {
            search_preferences: {
              price_max: 1000000,
              bedrooms_min: 3,
            },
            ui_preferences: {
              theme: 'dark',
              cards_per_view: 12,
            },
          },
          onboarding_completed: true,
        }

        const mockUpdatedProfile: UserProfile = {
          id: 'user-123',
          preferences: profileUpdate.preferences,
          onboarding_completed: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
          household_id: null,
        }

        // Set up the working mock pattern for update
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockUpdatedProfile,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockEq = jest.fn().mockReturnValue({ select: mockSelect })
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.updateUserProfile(
          'user-123',
          profileUpdate
        )

        expect(mockFrom).toHaveBeenCalledWith('user_profiles')
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            ...profileUpdate,
            updated_at: expect.any(String),
          })
        )
        expect(mockEq).toHaveBeenCalledWith('id', 'user-123')
        expect(result).toEqual(mockUpdatedProfile)
      })

      test('should handle onboarding completion workflow', async () => {
        const profileUpdate: UserProfileUpdate = {
          onboarding_completed: true,
          preferences: {
            search_preferences: {
              price_min: 300000,
              price_max: 700000,
              bedrooms_min: 2,
              bathrooms_min: 1,
            },
          },
        }

        const mockProfile: UserProfile = {
          id: 'user-onboarding',
          onboarding_completed: true,
          preferences: profileUpdate.preferences,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          household_id: null,
        }

        // Set up the working mock pattern
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockEq = jest.fn().mockReturnValue({ select: mockSelect })
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.updateUserProfile(
          'user-onboarding',
          profileUpdate
        )

        expect(result?.onboarding_completed).toBe(true)
        expect(result?.preferences).toEqual(profileUpdate.preferences)
      })

      test('should validate profile data integrity and constraints', async () => {
        const invalidUpdate: UserProfileUpdate = {
          household_id: 'nonexistent-household',
        }

        // Set up the working mock pattern for error case
        const mockSingle = jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Foreign key constraint violation' },
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockEq = jest.fn().mockReturnValue({ select: mockSelect })
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.updateUserProfile(
          'user-123',
          invalidUpdate
        )

        expect(result).toBeNull()
      })
    })

    describe('getUserProfileWithHousehold', () => {
      test('should retrieve user profile with household relationship', async () => {
        const mockUserWithHousehold = {
          id: 'user-with-household',
          preferences: null,
          onboarding_completed: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          household_id: 'household-123',
          household: {
            id: 'household-123',
            name: 'Smith Family',
            collaboration_mode: 'shared',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        }

        // Set up the working mock pattern with relationship
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockUserWithHousehold,
          error: null,
        })
        const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.getUserProfileWithHousehold(
          'user-with-household'
        )

        expect(mockFrom).toHaveBeenCalledWith('user_profiles')
        expect(mockSelect).toHaveBeenCalledWith(
          expect.stringContaining('household:households(*)')
        )
        expect(result?.household).toBeDefined()
        expect(result?.household?.name).toBe('Smith Family')
      })
    })
  })

  describe('Household Operations', () => {
    describe('createHousehold', () => {
      test('should create household with collaboration modes', async () => {
        const householdInsert: HouseholdInsert = {
          name: 'Johnson Family',
          collaboration_mode: 'weighted',
        }

        const mockCreatedHousehold: Household = {
          ...householdInsert,
          id: 'household-456',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }

        // Set up the working mock pattern
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockCreatedHousehold,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockInsert = jest.fn().mockReturnValue({ select: mockSelect })
        const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.createHousehold(householdInsert)

        expect(mockFrom).toHaveBeenCalledWith('households')
        expect(mockInsert).toHaveBeenCalledWith(householdInsert)
        expect(result).toEqual(mockCreatedHousehold)
      })
    })

    describe('joinHousehold', () => {
      test('should join user to household with proper permissions', async () => {
        const mockJoinedProfile: UserProfile = {
          id: 'user-joining',
          household_id: 'household-789',
          preferences: null,
          onboarding_completed: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        }

        // Set up the working mock pattern
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockJoinedProfile,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockEq = jest.fn().mockReturnValue({ select: mockSelect })
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.joinHousehold(
          'user-joining',
          'household-789'
        )

        expect(mockFrom).toHaveBeenCalledWith('user_profiles')
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            household_id: 'household-789',
            updated_at: expect.any(String),
          })
        )
        expect(result?.household_id).toBe('household-789')
      })
    })

    describe('getHouseholdMembers', () => {
      test('should handle household member coordination', async () => {
        const mockMembers: UserProfile[] = [
          {
            id: 'member-1',
            household_id: 'household-coordination',
            preferences: null,
            onboarding_completed: true,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 'member-2',
            household_id: 'household-coordination',
            preferences: null,
            onboarding_completed: false,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]

        // Set up the working mock pattern for array result
        const mockEq = jest.fn().mockResolvedValue({
          data: mockMembers,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.getHouseholdMembers(
          'household-coordination'
        )

        expect(mockFrom).toHaveBeenCalledWith('user_profiles')
        expect(mockSelect).toHaveBeenCalledWith('*')
        expect(mockEq).toHaveBeenCalledWith(
          'household_id',
          'household-coordination'
        )
        expect(result).toHaveLength(2)
      })
    })

    describe('leaveHousehold', () => {
      test('should leave household with data cleanup', async () => {
        const mockLeftProfile: UserProfile = {
          id: 'user-leaving',
          household_id: null,
          preferences: null,
          onboarding_completed: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        }

        // Set up the working mock pattern
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockLeftProfile,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockEq = jest.fn().mockReturnValue({ select: mockSelect })
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.leaveHousehold('user-leaving')

        expect(result?.household_id).toBeNull()
      })
    })
  })

  describe('Interaction Tracking (Consolidated Architecture)', () => {
    describe('recordInteraction', () => {
      test('should record property interaction with ML score storage', async () => {
        const interactionInsert: UserPropertyInteractionInsert = {
          user_id: 'user-ml-test',
          property_id: 'prop-ml-test',
          interaction_type: 'like',
          score_data: {
            ml_score: 0.85,
            cold_start_score: 0.7,
            online_lr_score: 0.82,
            lightgbm_score: 0.88,
            feature_importance: {
              price: 0.3,
              location: 0.25,
              bedrooms: 0.2,
              bathrooms: 0.15,
              square_feet: 0.1,
            },
            model_version: 'v2.1',
            created_at: '2024-01-01T00:00:00.000Z',
          },
        }

        const mockRecordedInteraction: UserPropertyInteraction = {
          ...interactionInsert,
          id: 'interaction-ml-123',
          created_at: '2024-01-01T00:00:00.000Z',
          household_id: null,
        }

        // Set up the working mock pattern for upsert
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockRecordedInteraction,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockUpsert = jest.fn().mockReturnValue({ select: mockSelect })
        const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.recordInteraction(interactionInsert)

        expect(mockFrom).toHaveBeenCalledWith('user_property_interactions')
        expect(mockUpsert).toHaveBeenCalledWith(interactionInsert, {
          onConflict: 'user_id,property_id,interaction_type',
        })
        expect(result?.score_data).toEqual(interactionInsert.score_data)
      })

      test('should handle interaction upserts and deduplication', async () => {
        const duplicateInteraction: UserPropertyInteractionInsert = {
          user_id: 'user-duplicate',
          property_id: 'prop-duplicate',
          interaction_type: 'view',
        }

        const mockUpsertedInteraction: UserPropertyInteraction = {
          ...duplicateInteraction,
          id: 'interaction-duplicate',
          created_at: '2024-01-01T00:00:00.000Z',
          household_id: null,
          score_data: null,
        }

        // Set up the working mock pattern for upsert
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockUpsertedInteraction,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockUpsert = jest.fn().mockReturnValue({ select: mockSelect })
        const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.recordInteraction(duplicateInteraction)

        expect(mockUpsert).toHaveBeenCalledWith(duplicateInteraction, {
          onConflict: 'user_id,property_id,interaction_type',
        })
        expect(result).toEqual(mockUpsertedInteraction)
      })
    })

    describe('getUserInteractions', () => {
      test('should retrieve user interactions by type and property', async () => {
        const mockInteractions: UserPropertyInteraction[] = [
          {
            id: 'interaction-1',
            user_id: 'user-interactions',
            property_id: 'prop-1',
            interaction_type: 'like',
            score_data: { ml_score: 0.9 },
            created_at: '2024-01-01T00:00:00.000Z',
            household_id: null,
          },
          {
            id: 'interaction-2',
            user_id: 'user-interactions',
            property_id: 'prop-2',
            interaction_type: 'dislike',
            score_data: { ml_score: 0.2 },
            created_at: '2024-01-01T00:00:00.000Z',
            household_id: null,
          },
        ]

        // Set up the working mock pattern for getUserInteractions
        const mockLimit = jest.fn().mockResolvedValue({
          data: mockInteractions,
          error: null,
        })
        const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })
        const mockEq = jest.fn().mockReturnValue({ order: mockOrder })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.getUserInteractions(
          'user-interactions',
          50
        )

        expect(mockFrom).toHaveBeenCalledWith('user_property_interactions')
        expect(mockEq).toHaveBeenCalledWith('user_id', 'user-interactions')
        expect(mockOrder).toHaveBeenCalledWith('created_at', {
          ascending: false,
        })
        expect(mockLimit).toHaveBeenCalledWith(50)
        expect(result).toHaveLength(2)
      })
    })

    describe('getUserInteractionsByType', () => {
      test('should store and retrieve ML score data in JSONB fields', async () => {
        const mockLikes: UserPropertyInteraction[] = [
          {
            id: 'like-1',
            user_id: 'user-ml-scores',
            property_id: 'prop-liked',
            interaction_type: 'like',
            score_data: {
              ml_score: 0.95,
              feature_importance: {
                price: 0.4,
                location: 0.3,
                bedrooms: 0.3,
              },
            },
            created_at: '2024-01-01T00:00:00.000Z',
            household_id: null,
          },
        ]

        // Set up the working mock pattern for getUserInteractionsByType
        const mockOrder = jest.fn().mockResolvedValue({
          data: mockLikes,
          error: null,
        })
        const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder })
        const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })
        const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.getUserInteractionsByType(
          'user-ml-scores',
          'like'
        )

        expect(mockEq2).toHaveBeenCalledWith('interaction_type', 'like')
        expect(result[0]?.score_data).toHaveProperty('ml_score', 0.95)
        expect(result[0]?.score_data).toHaveProperty('feature_importance')
      })

      test('should track interaction analytics and patterns', async () => {
        const mockViewInteractions: UserPropertyInteraction[] = Array.from(
          { length: 25 },
          (_, i) => ({
            id: `view-${i}`,
            user_id: 'user-analytics',
            property_id: `prop-viewed-${i}`,
            interaction_type: 'view',
            score_data: { ml_score: 0.6 + i * 0.01 },
            created_at: '2024-01-01T00:00:00.000Z',
            household_id: null,
          })
        )

        // Set up the working mock pattern for large dataset
        const mockOrder = jest.fn().mockResolvedValue({
          data: mockViewInteractions,
          error: null,
        })
        const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder })
        const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })
        const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.getUserInteractionsByType(
          'user-analytics',
          'view'
        )

        expect(result).toHaveLength(25)
        expect(
          result.every((interaction) => interaction.interaction_type === 'view')
        ).toBe(true)
      })
    })
  })

  describe('Saved Searches', () => {
    describe('createSavedSearch', () => {
      test('should create saved search with filters', async () => {
        const searchInsert: SavedSearchInsert = {
          user_id: 'user-search',
          name: 'Family Home Search',
          filters: {
            price_min: 400000,
            price_max: 700000,
            bedrooms_min: 3,
            property_types: ['house'],
            neighborhoods: ['neigh-family-friendly'],
          },
        }

        const mockSavedSearch: SavedSearch = {
          ...searchInsert,
          id: 'search-123',
          is_active: true,
          created_at: '2024-01-01T00:00:00.000Z',
          household_id: null,
        }

        // Set up the working mock pattern for createSavedSearch
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockSavedSearch,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockInsert = jest.fn().mockReturnValue({ select: mockSelect })
        const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.createSavedSearch(searchInsert)

        expect(mockFrom).toHaveBeenCalledWith('saved_searches')
        expect(mockInsert).toHaveBeenCalledWith(searchInsert)
        expect(result).toEqual(mockSavedSearch)
      })
    })

    describe('getUserSavedSearches', () => {
      test('should retrieve user saved searches', async () => {
        const mockSavedSearches: SavedSearch[] = [
          {
            id: 'search-1',
            user_id: 'user-saved-searches',
            name: 'Downtown Condos',
            filters: { property_types: ['condo'] },
            is_active: true,
            created_at: '2024-01-01T00:00:00.000Z',
            household_id: null,
          },
        ]

        // Set up the working mock pattern for saved searches
        const mockOrder = jest.fn().mockResolvedValue({
          data: mockSavedSearches,
          error: null,
        })
        const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder })
        const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })
        const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result = await userService.getUserSavedSearches(
          'user-saved-searches'
        )

        expect(mockFrom).toHaveBeenCalledWith('saved_searches')
        expect(mockEq1).toHaveBeenCalledWith('user_id', 'user-saved-searches')
        expect(mockEq2).toHaveBeenCalledWith('is_active', true)
        expect(result).toHaveLength(1)
      })
    })
  })

  describe('Analytics and Insights', () => {
    describe('getUserActivitySummary', () => {
      test('should generate user activity summaries', async () => {
        // Mock the individual interaction type calls
        const mockLikes = [{ id: '1' }, { id: '2' }, { id: '3' }]
        const mockDislikes = [{ id: '4' }]
        const mockViews = [
          { id: '5' },
          { id: '6' },
          { id: '7' },
          { id: '8' },
          { id: '9' },
        ]
        const mockSavedSearches = [{ id: 'search-1' }, { id: 'search-2' }]

        // Mock each method call in sequence
        userService.getUserInteractionsByType = jest
          .fn()
          .mockResolvedValueOnce(mockLikes as any[])
          .mockResolvedValueOnce(mockDislikes as any[])
          .mockResolvedValueOnce(mockViews as any[])

        userService.getUserSavedSearches = jest
          .fn()
          .mockResolvedValue(mockSavedSearches as any[])

        const result = await userService.getUserActivitySummary('user-summary')

        expect(result).toEqual({
          likes: 3,
          dislikes: 1,
          views: 5,
          saved_searches: 2,
          total_interactions: 9, // likes + dislikes + views
        })
      })
    })

    describe('getHouseholdActivitySummary', () => {
      test('should generate household activity summaries across members', async () => {
        const mockMembers: UserProfile[] = [
          { id: 'member-1' } as UserProfile,
          { id: 'member-2' } as UserProfile,
        ]

        const mockMember1Activity = {
          likes: 5,
          dislikes: 2,
          views: 10,
          saved_searches: 3,
          total_interactions: 17,
        }

        const mockMember2Activity = {
          likes: 3,
          dislikes: 1,
          views: 8,
          saved_searches: 1,
          total_interactions: 12,
        }

        userService.getHouseholdMembers = jest
          .fn()
          .mockResolvedValue(mockMembers)

        userService.getUserActivitySummary = jest
          .fn()
          .mockResolvedValueOnce(mockMember1Activity)
          .mockResolvedValueOnce(mockMember2Activity)

        const result =
          await userService.getHouseholdActivitySummary('household-summary')

        expect(result).toEqual({
          members: 2,
          total_likes: 8, // 5 + 3
          total_dislikes: 3, // 2 + 1
          total_views: 18, // 10 + 8
          total_saved_searches: 4, // 3 + 1
          total_interactions: 29, // 17 + 12
        })
      })
    })
  })
})
