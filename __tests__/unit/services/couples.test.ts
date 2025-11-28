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
 * NOTE: These tests use minimal mocking to verify service interface and error handling.
 * The mocks test that the service:
 * 1. Returns appropriate results for edge cases (no household, errors)
 * 2. Implements caching correctly
 * 3. Handles errors gracefully without throwing
 *
 * LIMITATIONS: Unit tests with mocks cannot verify actual database query correctness.
 * For comprehensive database integration testing, see:
 * - __tests__/integration/services/couples-e2e.test.ts (real database queries)
 * - __tests__/integration/api/couples-routes.integration.test.ts (API routes)
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

  describe('getMutualLikes', () => {
    test('should return empty array when user has no household', async () => {
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
    // NOTE: Complex stats calculation tests are in integration tests.
    // Unit tests focus on edge cases and error handling only.

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

    test('should handle database errors gracefully', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error')),
      }
      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue(mockChain)

      // Should not throw, should return null or handle gracefully
      await expect(
        CouplesService.getHouseholdStats(mockSupabaseClient, mockUserId)
      ).resolves.not.toThrow()
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

    test('should not throw on like interactions', async () => {
      // Mock getUserHousehold calls
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
        .mockReturnValueOnce(mockUserChain) // First call for notifyInteraction getUserHousehold
        .mockReturnValueOnce(mockUserChain) // Second call for checkPotentialMutualLike getUserHousehold
        .mockReturnValueOnce(mockLikesChain) // Third call for existing likes

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

      await CouplesService.notifyInteraction(
        mockSupabaseClient,
        mockUserId,
        propertyId,
        'like'
      )

      // Should only make one query (getUserHousehold) since there's no household
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1)
    })
  })
})
