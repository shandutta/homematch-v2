// Phase 0/1 closure: M14-unused-couples-middleware
import {
  // Phase 0/1 closure: M14-unused-couples-middleware

  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { existsSync } from 'fs'
import { join } from 'path'
import { CouplesService } from '@/lib/services/couples'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'

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
  test('does not keep the unused CouplesMiddleware wrapper module', () => {
    expect(
      existsSync(join(process.cwd(), 'src/lib/services/couples-middleware.ts'))
    ).toBe(false)
  })

  // Create a mock Supabase client
  const mockSupabaseClient: SupabaseClient<AppDatabase> = createClient(
    'http://localhost:54321',
    'test-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: async () =>
          new Response(JSON.stringify({ data: null, error: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      },
    }
  )
  const fromMock: jest.MockedFunction<typeof mockSupabaseClient.from> =
    jest.fn()
  const rpcMock: jest.MockedFunction<typeof mockSupabaseClient.rpc> = jest.fn()

  mockSupabaseClient.from = fromMock
  mockSupabaseClient.rpc = rpcMock

  const mockUserId = 'user-123'
  const mockHouseholdId = 'household-456'

  // Route rpc() calls by name. The D1 follow-up moved getUserHousehold
  // to `get_user_household_id`, and most read methods also call another
  // RPC for their actual data — so tests routinely need to mock two
  // RPC names side by side. Routing through a `jest.Mock`-typed helper
  // keeps the supabase-js rpc overload set off the call signature.
  type RpcResult = { data: unknown; error: Error | null }
  type RpcResponder = () => Promise<RpcResult>
  const installRpcByName = (
    mock: jest.Mock,
    responders: Record<string, RpcResponder>
  ) => {
    mock.mockImplementation((name: string) => {
      const responder = responders[name]
      if (!responder) {
        return Promise.resolve({
          data: null,
          error: new Error(`unmocked RPC: ${name}`),
        })
      }
      return responder()
    })
  }
  const mockRpcByName = (responders: Record<string, RpcResponder>) =>
    installRpcByName(rpcMock, responders)
  const householdRpc = (
    householdId: string | null,
    error: Error | null = null
  ): Record<string, RpcResponder> => ({
    get_user_household_id: async () => ({ data: householdId, error }),
  })

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
      mockRpcByName(householdRpc(null))

      const result = await CouplesService.getMutualLikes(
        mockSupabaseClient,
        mockUserId
      )
      expect(result).toEqual([])
    })

    test('should return cached results when available', async () => {
      mockRpcByName({
        ...householdRpc(mockHouseholdId),
        get_household_mutual_likes: async () => ({
          data: [{ property_id: 'prop-1', liked_by_count: 2 }],
          error: null,
        }),
      })

      // First call should populate the mutual-likes cache
      const result1 = await CouplesService.getMutualLikes(
        mockSupabaseClient,
        mockUserId
      )
      // Second call should hit the cache for mutual likes
      const result2 = await CouplesService.getMutualLikes(
        mockSupabaseClient,
        mockUserId
      )

      expect(result1).toEqual(result2)
      // Caching is per-RPC: getUserHousehold is uncached (cheap lookup),
      // but get_household_mutual_likes is cached by household_id, so the
      // second call must not re-issue it.
      const mutualLikesCalls = rpcMock.mock.calls.filter(
        ([name]) => name === 'get_household_mutual_likes'
      )
      expect(mutualLikesCalls).toHaveLength(1)
    })

    test('should handle RPC errors gracefully', async () => {
      // No fallback table fixture: errors should land in the catch path
      // and return [].
      mockRpcByName({
        ...householdRpc(mockHouseholdId),
        get_household_mutual_likes: async () => ({
          data: null,
          error: new Error('RPC failed'),
        }),
      })
      // Fallback chains through .from('user_property_interactions')
      // with .select().eq().eq(). Make .eq() return a thenable that
      // also re-exposes .eq for the second filter.
      const fallbackResult = { data: null, error: null }
      const fallbackChain: Record<string, jest.Mock> = {}
      fallbackChain.select = jest.fn(() => fallbackChain)
      fallbackChain.eq = jest.fn(() =>
        Object.assign(Promise.resolve(fallbackResult), {
          eq: fallbackChain.eq,
        })
      )
      fromMock.mockReturnValue(fallbackChain)

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
      mockRpcByName(householdRpc(null))

      const result = await CouplesService.getHouseholdStats(
        mockSupabaseClient,
        mockUserId
      )

      expect(result).toBeNull()
    })

    test('should handle database errors gracefully', async () => {
      // RPC throws → CouplesService.getUserHousehold catches and returns
      // null; the caller's catch path produces a null/empty result.
      rpcMock.mockImplementation(() => {
        throw new Error('Database error')
      })

      await expect(
        CouplesService.getHouseholdStats(mockSupabaseClient, mockUserId)
      ).resolves.not.toThrow()
    })
  })

  describe('checkPotentialMutualLike', () => {
    const propertyId = 'prop-123'

    test('should return true when partner has already liked property', async () => {
      mockRpcByName(householdRpc(mockHouseholdId))

      // Likes lookup still goes through .from('user_property_interactions')
      const mockLikesChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [{ user_id: 'partner-456' }],
          error: null,
        }),
      }
      fromMock.mockReturnValue(mockLikesChain)

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
      mockRpcByName(householdRpc(mockHouseholdId))

      const mockLikesChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }
      fromMock.mockReturnValue(mockLikesChain)

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
      mockRpcByName(householdRpc(null))

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
      mockRpcByName(householdRpc(mockHouseholdId))

      const mockLikesChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockRejectedValue(new Error('Database error')),
      }
      fromMock.mockReturnValue(mockLikesChain)

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
      mockRpcByName(householdRpc(mockHouseholdId))

      const mockLikesChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockResolvedValue({
          data: [{ user_id: 'partner-456' }],
          error: null,
        }),
      }
      fromMock.mockReturnValue(mockLikesChain)

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
      mockRpcByName(householdRpc(mockHouseholdId))

      await CouplesService.notifyInteraction(
        mockSupabaseClient,
        mockUserId,
        propertyId,
        'dislike'
      )

      // notifyInteraction calls getUserHousehold once via the RPC; on a
      // non-like it returns without invoking checkPotentialMutualLike,
      // so no .from() calls happen at all.
      expect(rpcMock).toHaveBeenCalledWith('get_user_household_id', {
        p_user_id: mockUserId,
      })
      expect(fromMock).not.toHaveBeenCalled()
    })

    test('should handle errors gracefully', async () => {
      rpcMock.mockImplementation(() => {
        throw new Error('Database error')
      })

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
      mockRpcByName(householdRpc(null))

      await CouplesService.notifyInteraction(
        mockSupabaseClient,
        mockUserId,
        propertyId,
        'like'
      )

      // Single household lookup; no follow-on .from() calls.
      expect(rpcMock).toHaveBeenCalledWith('get_user_household_id', {
        p_user_id: mockUserId,
      })
      expect(fromMock).not.toHaveBeenCalled()
    })
  })
})
