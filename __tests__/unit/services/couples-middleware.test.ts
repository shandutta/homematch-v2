import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { CouplesMiddleware } from '@/lib/services/couples-middleware'
import { CouplesService } from '@/lib/services/couples'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock the CouplesService
jest.mock('@/lib/services/couples')
const mockCouplesService = CouplesService as jest.Mocked<typeof CouplesService>

/**
 * CouplesMiddleware Unit Tests
 *
 * NOTE: These tests mock the entire CouplesService to test the MIDDLEWARE's
 * orchestration logic in isolation. This tests:
 * 1. Middleware calls correct service methods in correct order
 * 2. Middleware handles service responses correctly
 * 3. Middleware returns correct structure to callers
 *
 * LIMITATIONS: Mocking the service means these tests don't verify that
 * CouplesService actually works - just that middleware calls it correctly.
 * For real service behavior, see:
 * - __tests__/unit/services/couples.test.ts (service unit tests)
 * - __tests__/integration/couples-e2e.test.ts (full integration)
 */
describe('CouplesMiddleware', () => {
  const mockSupabaseClient = {} as SupabaseClient
  const mockUserId = 'user-123'
  const mockPropertyId = 'prop-456'
  const mockHouseholdId = 'household-789'

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks
    mockCouplesService.checkPotentialMutualLike.mockResolvedValue({
      wouldBeMutual: false,
    })
    mockCouplesService.notifyInteraction.mockResolvedValue(undefined)
    mockCouplesService.clearHouseholdCache.mockImplementation(() => {})
    mockCouplesService.getMutualLikes.mockResolvedValue([])
    mockCouplesService.getHouseholdActivity.mockResolvedValue([])
    mockCouplesService.getHouseholdStats.mockResolvedValue(null)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('onPropertyInteraction', () => {
    test('should handle successful like interaction that creates mutual like', async () => {
      mockCouplesService.checkPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: true,
        partnerUserId: 'partner-456',
      })

      const result = await CouplesMiddleware.onPropertyInteraction(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'like'
      )

      expect(mockCouplesService.checkPotentialMutualLike).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId
      )
      expect(mockCouplesService.notifyInteraction).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'like'
      )
      expect(result).toEqual({
        mutualLikeCreated: true,
        partnerUserId: 'partner-456',
        cacheCleared: true,
      })
    })

    test('should handle successful like interaction without mutual like', async () => {
      mockCouplesService.checkPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: false,
      })

      const result = await CouplesMiddleware.onPropertyInteraction(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'like'
      )

      expect(mockCouplesService.checkPotentialMutualLike).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId
      )
      expect(mockCouplesService.notifyInteraction).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'like'
      )
      expect(result).toEqual({
        mutualLikeCreated: false,
        partnerUserId: undefined,
        cacheCleared: true,
      })
    })

    test('should handle successful dislike interaction', async () => {
      mockCouplesService.checkPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: true,
        partnerUserId: 'partner-456',
      })

      const result = await CouplesMiddleware.onPropertyInteraction(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'dislike'
      )

      expect(mockCouplesService.checkPotentialMutualLike).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId
      )
      expect(mockCouplesService.notifyInteraction).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'dislike'
      )
      // Even if wouldBeMutual is true, dislike shouldn't create mutual like
      expect(result).toEqual({
        mutualLikeCreated: false,
        partnerUserId: 'partner-456',
        cacheCleared: true,
      })
    })

    test('should handle view interaction correctly', async () => {
      mockCouplesService.checkPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: false,
      })

      const result = await CouplesMiddleware.onPropertyInteraction(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'view'
      )

      expect(mockCouplesService.checkPotentialMutualLike).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId
      )
      expect(mockCouplesService.notifyInteraction).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'view'
      )
      expect(result).toEqual({
        mutualLikeCreated: false,
        partnerUserId: undefined,
        cacheCleared: true,
      })
    })

    test('should handle error in checkPotentialMutualLike gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      mockCouplesService.checkPotentialMutualLike.mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await CouplesMiddleware.onPropertyInteraction(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'like'
      )

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CouplesMiddleware] Error handling property interaction:',
        expect.any(Error)
      )
      expect(result).toEqual({
        mutualLikeCreated: false,
        cacheCleared: false,
      })

      consoleErrorSpy.mockRestore()
    })

    test('should handle error in notifyInteraction gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      mockCouplesService.checkPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: true,
        partnerUserId: 'partner-456',
      })
      mockCouplesService.notifyInteraction.mockRejectedValue(
        new Error('Cache clear failed')
      )

      const result = await CouplesMiddleware.onPropertyInteraction(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'like'
      )

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CouplesMiddleware] Error handling property interaction:',
        expect.any(Error)
      )
      expect(result).toEqual({
        mutualLikeCreated: false,
        cacheCleared: false,
      })

      consoleErrorSpy.mockRestore()
    })

    test('should call both services in correct order', async () => {
      const callOrder: string[] = []

      mockCouplesService.checkPotentialMutualLike.mockImplementation(
        async () => {
          callOrder.push('checkPotentialMutualLike')
          return { wouldBeMutual: false }
        }
      )

      mockCouplesService.notifyInteraction.mockImplementation(async () => {
        callOrder.push('notifyInteraction')
      })

      await CouplesMiddleware.onPropertyInteraction(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'like'
      )

      expect(callOrder).toEqual([
        'checkPotentialMutualLike',
        'notifyInteraction',
      ])
    })

    test('should handle multiple interaction types correctly', async () => {
      const interactionTypes = ['like', 'dislike', 'view', 'save', 'share']

      for (const interactionType of interactionTypes) {
        jest.clearAllMocks()

        mockCouplesService.checkPotentialMutualLike.mockResolvedValue({
          wouldBeMutual: true,
          partnerUserId: 'partner-456',
        })

        const result = await CouplesMiddleware.onPropertyInteraction(
          mockSupabaseClient,
          mockUserId,
          mockPropertyId,
          interactionType
        )

        expect(
          mockCouplesService.checkPotentialMutualLike
        ).toHaveBeenCalledWith(mockSupabaseClient, mockUserId, mockPropertyId)
        expect(mockCouplesService.notifyInteraction).toHaveBeenCalledWith(
          mockSupabaseClient,
          mockUserId,
          mockPropertyId,
          interactionType
        )

        // Only 'like' should create mutual like
        expect(result.mutualLikeCreated).toBe(interactionType === 'like')
        expect(result.partnerUserId).toBe('partner-456')
        expect(result.cacheCleared).toBe(true)
      }
    })
  })

  describe('onHouseholdChange', () => {
    test('should clear household cache successfully', async () => {
      await CouplesMiddleware.onHouseholdChange(mockHouseholdId)

      expect(mockCouplesService.clearHouseholdCache).toHaveBeenCalledWith(
        mockHouseholdId
      )
    })

    test('should handle cache clearing errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      mockCouplesService.clearHouseholdCache.mockImplementation(() => {
        throw new Error('Cache clear failed')
      })

      // Should not throw
      await expect(
        CouplesMiddleware.onHouseholdChange(mockHouseholdId)
      ).resolves.not.toThrow()

      expect(mockCouplesService.clearHouseholdCache).toHaveBeenCalledWith(
        mockHouseholdId
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CouplesMiddleware] Error clearing household cache:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    test('should handle null or undefined household ID', async () => {
      await CouplesMiddleware.onHouseholdChange(null as any)
      expect(mockCouplesService.clearHouseholdCache).toHaveBeenCalledWith(null)

      jest.clearAllMocks()

      await CouplesMiddleware.onHouseholdChange(undefined as any)
      expect(mockCouplesService.clearHouseholdCache).toHaveBeenCalledWith(
        undefined
      )
    })

    test('should handle empty string household ID', async () => {
      await CouplesMiddleware.onHouseholdChange('')
      expect(mockCouplesService.clearHouseholdCache).toHaveBeenCalledWith('')
    })
  })

  describe('warmCache', () => {
    test('should warm cache successfully', async () => {
      await CouplesMiddleware.warmCache(mockSupabaseClient, mockUserId)

      expect(mockCouplesService.getMutualLikes).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId
      )
      expect(mockCouplesService.getHouseholdActivity).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId,
        20
      )
      expect(mockCouplesService.getHouseholdStats).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId
      )
    })

    test('should handle individual service failures gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      mockCouplesService.getMutualLikes.mockRejectedValue(
        new Error('Failed to get mutual likes')
      )
      mockCouplesService.getHouseholdActivity.mockResolvedValue([])
      mockCouplesService.getHouseholdStats.mockResolvedValue(null)

      await CouplesMiddleware.warmCache(mockSupabaseClient, mockUserId)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CouplesMiddleware] Error warming cache:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    test('should handle all services failing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      const errorMessage = 'Database connection failed'
      mockCouplesService.getMutualLikes.mockRejectedValue(
        new Error(errorMessage)
      )
      mockCouplesService.getHouseholdActivity.mockRejectedValue(
        new Error(errorMessage)
      )
      mockCouplesService.getHouseholdStats.mockRejectedValue(
        new Error(errorMessage)
      )

      await CouplesMiddleware.warmCache(mockSupabaseClient, mockUserId)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CouplesMiddleware] Error warming cache:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    test('should call all cache warming services in parallel', async () => {
      const callTimestamps: { service: string; timestamp: number }[] = []

      mockCouplesService.getMutualLikes.mockImplementation(async () => {
        callTimestamps.push({
          service: 'getMutualLikes',
          timestamp: Date.now(),
        })
        await new Promise((resolve) => setTimeout(resolve, 10))
        return []
      })

      mockCouplesService.getHouseholdActivity.mockImplementation(async () => {
        callTimestamps.push({
          service: 'getHouseholdActivity',
          timestamp: Date.now(),
        })
        await new Promise((resolve) => setTimeout(resolve, 10))
        return []
      })

      mockCouplesService.getHouseholdStats.mockImplementation(async () => {
        callTimestamps.push({
          service: 'getHouseholdStats',
          timestamp: Date.now(),
        })
        await new Promise((resolve) => setTimeout(resolve, 10))
        return null
      })

      await CouplesMiddleware.warmCache(mockSupabaseClient, mockUserId)

      // All calls should start at roughly the same time (within 5ms)
      const startTimes = callTimestamps.map((call) => call.timestamp)
      const maxTimeDiff = Math.max(...startTimes) - Math.min(...startTimes)
      expect(maxTimeDiff).toBeLessThan(5)

      // All services should have been called
      expect(callTimestamps).toHaveLength(3)
      expect(callTimestamps.map((call) => call.service)).toContain(
        'getMutualLikes'
      )
      expect(callTimestamps.map((call) => call.service)).toContain(
        'getHouseholdActivity'
      )
      expect(callTimestamps.map((call) => call.service)).toContain(
        'getHouseholdStats'
      )
    })

    test('should handle null or undefined user ID', async () => {
      await CouplesMiddleware.warmCache(mockSupabaseClient, null as any)
      expect(mockCouplesService.getMutualLikes).toHaveBeenCalledWith(
        mockSupabaseClient,
        null
      )

      jest.clearAllMocks()

      await CouplesMiddleware.warmCache(mockSupabaseClient, undefined as any)
      expect(mockCouplesService.getMutualLikes).toHaveBeenCalledWith(
        mockSupabaseClient,
        undefined
      )
    })

    test('should use correct limit for getHouseholdActivity', async () => {
      await CouplesMiddleware.warmCache(mockSupabaseClient, mockUserId)

      expect(mockCouplesService.getHouseholdActivity).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUserId,
        20 // Verify the hardcoded limit
      )
    })
  })

  describe('static methods', () => {
    test('all methods should be static', () => {
      expect(typeof CouplesMiddleware.onPropertyInteraction).toBe('function')
      expect(typeof CouplesMiddleware.onHouseholdChange).toBe('function')
      expect(typeof CouplesMiddleware.warmCache).toBe('function')

      // Verify they can be called without instantiation
      expect(CouplesMiddleware.onPropertyInteraction).toBeDefined()
      expect(CouplesMiddleware.onHouseholdChange).toBeDefined()
      expect(CouplesMiddleware.warmCache).toBeDefined()
    })
  })

  describe('error logging', () => {
    test('should log errors with consistent format', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      mockCouplesService.checkPotentialMutualLike.mockRejectedValue(
        new Error('Test error')
      )

      await CouplesMiddleware.onPropertyInteraction(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'like'
      )

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[CouplesMiddleware] Error handling property interaction:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    test('should maintain consistent logging prefix across methods', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      // Test onPropertyInteraction error
      mockCouplesService.checkPotentialMutualLike.mockRejectedValue(
        new Error('Test')
      )
      await CouplesMiddleware.onPropertyInteraction(
        mockSupabaseClient,
        mockUserId,
        mockPropertyId,
        'like'
      )

      // Test onHouseholdChange error
      jest.clearAllMocks()
      mockCouplesService.clearHouseholdCache.mockImplementation(() => {
        throw new Error('Test')
      })
      await CouplesMiddleware.onHouseholdChange(mockHouseholdId)

      // Test warmCache error
      jest.clearAllMocks()
      mockCouplesService.getMutualLikes.mockRejectedValue(new Error('Test'))
      await CouplesMiddleware.warmCache(mockSupabaseClient, mockUserId)

      // All error messages should start with [CouplesMiddleware]
      const errorCalls = consoleErrorSpy.mock.calls
      expect(
        errorCalls.every((call) => call[0].startsWith('[CouplesMiddleware]'))
      ).toBe(true)

      consoleErrorSpy.mockRestore()
    })
  })
})
