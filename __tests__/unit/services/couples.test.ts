import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { CouplesService } from '@/lib/services/couples'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * CouplesService Unit Tests
 *
 * NOTE: These tests use mocking to verify service interface and error handling.
 * The mocks test that the service:
 * 1. Calls the correct Supabase methods (rpc, from)
 * 2. Handles errors gracefully
 * 3. Implements caching correctly
 *
 * LIMITATIONS: Heavy mocking means changes to Supabase query patterns might not
 * be caught. For full database integration testing, see:
 * - __tests__/integration/api/household-rpc.integration.test.ts
 * - __tests__/integration/couples-e2e.test.ts
 */
describe('CouplesService', () => {
  // Create a mock Supabase client
  const mockSupabaseClient = {
    from: jest.fn(),
    select: jest.fn(),
    rpc: jest.fn(),
  } as unknown as SupabaseClient

  const mockUserId = 'user-123'
  const mockHouseholdId = 'household-456'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Clear caches after each test to avoid interference
    CouplesService.clearHouseholdCache(mockHouseholdId)
    jest.resetAllMocks()
  })

  describe('clearHouseholdCache', () => {
    test('should clear all cache entries for a household', () => {
      // This method clears LRU caches, so we can't easily test it directly
      // but we can ensure it doesn't throw
      expect(() => {
        CouplesService.clearHouseholdCache(mockHouseholdId)
      }).not.toThrow()
    })
  })

  describe('getUserHousehold', () => {
    test('should return household ID for valid user', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: mockHouseholdId },
          error: null,
        }),
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChain)

      // Access private method through getMutualLikes
      await CouplesService.getMutualLikes(mockSupabaseClient, mockUserId)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles')
      expect(mockChain.select).toHaveBeenCalledWith('household_id')
      expect(mockChain.eq).toHaveBeenCalledWith('id', mockUserId)
    })

    test('should return null when user has no household', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: null },
          error: null,
        }),
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChain)

      const result = await CouplesService.getMutualLikes(
        mockSupabaseClient,
        mockUserId
      )
      expect(result).toEqual([])
    })
  })

  describe('getMutualLikes', () => {
    test('should return cached results when available', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: mockHouseholdId },
          error: null,
        }),
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChain)
      ;(mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
        data: [{ property_id: 'prop-1', liked_by_count: 2 }],
        error: null,
      })

      // First call should populate cache
      const result1 = await CouplesService.getMutualLikes(
        mockSupabaseClient,
        mockUserId
      )
      // Second call should use cache
      const result2 = await CouplesService.getMutualLikes(
        mockSupabaseClient,
        mockUserId
      )

      expect(result1).toEqual(result2)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(1)
    })

    test('should handle RPC errors gracefully', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: mockHouseholdId },
          error: null,
        }),
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChain)
      ;(mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      })

      // Should fallback to empty array rather than throw
      const result = await CouplesService.getMutualLikes(
        mockSupabaseClient,
        mockUserId
      )
      expect(result).toEqual([])
    })
  })

  describe('getHouseholdStats', () => {
    // NOTE: This test has complex mocking that tests mock behavior rather than
    // real database interactions. Consider this a contract test - it verifies
    // the service calls expected methods. Real stats calculation is tested in
    // integration tests.
    test('should calculate household statistics correctly', async () => {
      // Clear all caches before this test
      CouplesService.clearHouseholdCache(mockHouseholdId)

      // Create a mock that responds based on the table being queried
      const createMockChain = (table: string) => {
        if (table === 'user_profiles') {
          // Mock getUserHousehold call
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { household_id: mockHouseholdId },
              error: null,
            }),
          }
        } else if (table === 'user_property_interactions') {
          // Determine the type of query based on the chain methods called
          const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
          }

          // When eq is called twice, it's likely the count query
          let eqCallCount = 0
          chain.eq = jest.fn().mockImplementation((_field, _value) => {
            eqCallCount++
            if (eqCallCount >= 2) {
              // This is the count query
              return Promise.resolve({
                count: 5,
                error: null,
              })
            }
            return chain
          })

          // When limit is called, it's the activity query
          chain.limit = jest.fn().mockResolvedValue({
            data: [
              { created_at: '2024-01-03T00:00:00.000Z' },
              { created_at: '2024-01-02T00:00:00.000Z' },
              { created_at: '2024-01-01T00:00:00.000Z' },
            ],
            error: null,
          })

          return chain
        }

        // Default fallback
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }

      // Mock the from method to return appropriate chains based on table name
      ;(mockSupabaseClient.from as jest.Mock).mockImplementation(
        createMockChain
      )

      // Mock getMutualLikes RPC call
      ;(mockSupabaseClient.rpc as jest.Mock).mockClear()
      ;(mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
        data: [
          {
            property_id: 'prop-1',
            liked_by_count: 2,
            first_liked_at: '2024-01-01T00:00:00.000Z',
            last_liked_at: '2024-01-02T00:00:00.000Z',
            user_ids: ['user-123', 'user-456'],
          },
        ],
        error: null,
      })

      const result = await CouplesService.getHouseholdStats(
        mockSupabaseClient,
        mockUserId
      )

      expect(result).toEqual({
        total_mutual_likes: 1,
        total_household_likes: 5,
        activity_streak_days: expect.any(Number),
        last_mutual_like_at: '2024-01-02T00:00:00.000Z',
      })
    })

    test('should return null when no household found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: null },
          error: null,
        }),
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChain)

      const result = await CouplesService.getHouseholdStats(
        mockSupabaseClient,
        mockUserId
      )

      expect(result).toBeNull()
    })

    test('should handle empty mutual likes', async () => {
      // Clear all caches before this test
      CouplesService.clearHouseholdCache(mockHouseholdId)

      // Create a mock that responds based on the table being queried (empty scenario)
      const createMockChain = (table: string) => {
        if (table === 'user_profiles') {
          // Mock getUserHousehold call
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { household_id: mockHouseholdId },
              error: null,
            }),
          }
        } else if (table === 'user_property_interactions') {
          // Determine the type of query based on the chain methods called
          const chain = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
          }

          // When eq is called twice, it's likely the count query (returning 0)
          let eqCallCount = 0
          chain.eq = jest.fn().mockImplementation((_field, _value) => {
            eqCallCount++
            if (eqCallCount >= 2) {
              // This is the count query - return 0 for empty scenario
              return Promise.resolve({
                count: 0,
                error: null,
              })
            }
            return chain
          })

          // When limit is called, it's the activity query (returning empty array)
          chain.limit = jest.fn().mockResolvedValue({
            data: [],
            error: null,
          })

          return chain
        }

        // Default fallback
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      }

      // Mock the from method to return appropriate chains based on table name
      ;(mockSupabaseClient.from as jest.Mock).mockImplementation(
        createMockChain
      )

      // Mock empty getMutualLikes RPC call
      ;(mockSupabaseClient.rpc as jest.Mock).mockClear()
      ;(mockSupabaseClient.rpc as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await CouplesService.getHouseholdStats(
        mockSupabaseClient,
        mockUserId
      )

      expect(result).toEqual({
        total_mutual_likes: 0,
        total_household_likes: 0,
        activity_streak_days: 0,
        last_mutual_like_at: null,
      })
    })
  })

  describe('checkPotentialMutualLike', () => {
    const propertyId = 'prop-123'

    test('should return true when partner has already liked property', async () => {
      // Mock getUserHousehold call
      const mockUserChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: mockHouseholdId },
          error: null,
        }),
      }

      // Mock existing likes query
      const mockLikesChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [{ user_id: 'partner-456' }],
          error: null,
        }),
      }

      ;(mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce(mockUserChain) // First call for getUserHousehold
        .mockReturnValueOnce(mockLikesChain) // Second call for existing likes

      const result = await CouplesService.checkPotentialMutualLike(
        mockSupabaseClient,
        mockUserId,
        propertyId
      )

      expect(result).toEqual({
        wouldBeMutual: true,
        partnerUserId: 'partner-456',
      })
    })

    test('should return false when no partner has liked property', async () => {
      // Mock getUserHousehold call
      const mockUserChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: mockHouseholdId },
          error: null,
        }),
      }

      // Mock existing likes query with empty result
      const mockLikesChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      ;(mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce(mockUserChain) // First call for getUserHousehold
        .mockReturnValueOnce(mockLikesChain) // Second call for existing likes

      const result = await CouplesService.checkPotentialMutualLike(
        mockSupabaseClient,
        mockUserId,
        propertyId
      )

      expect(result).toEqual({
        wouldBeMutual: false,
      })
    })

    test('should return false when user has no household', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: null },
          error: null,
        }),
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChain)

      const result = await CouplesService.checkPotentialMutualLike(
        mockSupabaseClient,
        mockUserId,
        propertyId
      )

      expect(result).toEqual({
        wouldBeMutual: false,
      })
    })

    test('should handle database errors gracefully', async () => {
      // Mock getUserHousehold call
      const mockUserChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: mockHouseholdId },
          error: null,
        }),
      }

      // Mock existing likes query with error
      const mockLikesChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockRejectedValue(new Error('Database error')),
      }

      ;(mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce(mockUserChain) // First call for getUserHousehold
        .mockReturnValueOnce(mockLikesChain) // Second call for existing likes

      const result = await CouplesService.checkPotentialMutualLike(
        mockSupabaseClient,
        mockUserId,
        propertyId
      )

      expect(result).toEqual({
        wouldBeMutual: false,
      })
    })
  })

  describe('notifyInteraction', () => {
    const propertyId = 'prop-123'

    test('should clear cache and check for mutual like on like interaction', async () => {
      // Mock getUserHousehold call for notifyInteraction
      const mockUserChain1 = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: mockHouseholdId },
          error: null,
        }),
      }

      // Mock getUserHousehold call for checkPotentialMutualLike
      const mockUserChain2 = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: mockHouseholdId },
          error: null,
        }),
      }

      // Mock existing likes query
      const mockLikesChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [{ user_id: 'partner-456' }],
          error: null,
        }),
      }

      ;(mockSupabaseClient.from as jest.Mock)
        .mockReturnValueOnce(mockUserChain1) // First call for notifyInteraction getUserHousehold
        .mockReturnValueOnce(mockUserChain2) // Second call for checkPotentialMutualLike getUserHousehold
        .mockReturnValueOnce(mockLikesChain) // Third call for existing likes

      // Spy on console.log to verify mutual like logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await CouplesService.notifyInteraction(
        mockSupabaseClient,
        mockUserId,
        propertyId,
        'like'
      )

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Mutual like created: user-123 + partner-456 for property prop-123'
        )
      )

      consoleSpy.mockRestore()
    })

    test('should not check for mutual like on non-like interactions', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: mockHouseholdId },
          error: null,
        }),
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChain)

      await CouplesService.notifyInteraction(
        mockSupabaseClient,
        mockUserId,
        propertyId,
        'dislike'
      )

      // Should only call getUserHousehold once, not check for mutual likes
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_profiles')
    })

    test('should handle errors gracefully', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error')),
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChain)

      // Should not throw
      await expect(
        CouplesService.notifyInteraction(
          mockSupabaseClient,
          mockUserId,
          propertyId,
          'like'
        )
      ).resolves.not.toThrow()
    })

    test('should return early when user has no household', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { household_id: null },
          error: null,
        }),
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChain)

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      await CouplesService.notifyInteraction(
        mockSupabaseClient,
        mockUserId,
        propertyId,
        'like'
      )

      // Should not have logged a mutual like since there's no household
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Mutual like created:')
      )

      consoleSpy.mockRestore()
    })
  })
})
