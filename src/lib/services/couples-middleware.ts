import { CouplesService } from './couples'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'

/**
 * Middleware to handle couples-related side effects when property interactions occur
 */
export class CouplesMiddleware {
  /**
   * Call this after any property interaction is saved to the database
   */
  static async onPropertyInteraction(
    supabase: SupabaseClient<AppDatabase>,
    userId: string,
    propertyId: string,
    interactionType: string
  ): Promise<{
    mutualLikeCreated: boolean
    partnerUserId?: string
    cacheCleared: boolean
  }> {
    try {
      // Check if this would create a mutual like before clearing cache
      const { wouldBeMutual, partnerUserId } =
        await CouplesService.checkPotentialMutualLike(
          supabase,
          userId,
          propertyId
        )

      // Notify the couples service (this clears cache and handles notifications)
      await CouplesService.notifyInteraction(
        supabase,
        userId,
        propertyId,
        interactionType
      )

      return {
        mutualLikeCreated: wouldBeMutual && interactionType === 'like',
        partnerUserId,
        cacheCleared: true,
      }
    } catch (error) {
      console.error(
        '[CouplesMiddleware] Error handling property interaction:',
        error
      )
      return {
        mutualLikeCreated: false,
        cacheCleared: false,
      }
    }
  }

  /**
   * Call this when a user joins or leaves a household
   */
  static async onHouseholdChange(householdId: string): Promise<void> {
    try {
      CouplesService.clearHouseholdCache(householdId)
    } catch (error) {
      console.error(
        '[CouplesMiddleware] Error clearing household cache:',
        error
      )
    }
  }

  /**
   * Call this to warm up the cache for a household
   */
  static async warmCache(
    supabase: SupabaseClient<AppDatabase>,
    userId: string
  ): Promise<void> {
    try {
      // Trigger cache population by calling the main services
      await Promise.all([
        CouplesService.getMutualLikes(supabase, userId),
        CouplesService.getHouseholdActivity(supabase, userId, 20),
        CouplesService.getHouseholdStats(supabase, userId),
      ])
    } catch (error) {
      console.error('[CouplesMiddleware] Error warming cache:', error)
    }
  }
}
