/**
 * @module CouplesService
 * @description Service for managing couples' shared property interactions and mutual likes.
 * This service handles all household-related property decisions, activity tracking,
 * and synchronization between household members.
 */

import { LRUCache } from 'lru-cache'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Represents a property that has been liked by multiple household members
 * @interface MutualLike
 */
export interface MutualLike {
  /** Unique identifier of the property */
  property_id: string
  /** Number of household members who liked this property */
  liked_by_count: number
  /** Timestamp when the property was first liked by any household member */
  first_liked_at: string
  /** Timestamp when the property was most recently liked by any household member */
  last_liked_at: string
  /** Array of user IDs who liked this property */
  user_ids: string[]
}

/**
 * Represents an activity entry in the household's property interaction timeline
 * @interface HouseholdActivity
 */
export interface HouseholdActivity {
  /** Unique identifier of the interaction */
  id: string
  /** User ID who performed the interaction */
  user_id: string
  /** Property ID that was interacted with */
  property_id: string
  /** Type of interaction performed */
  interaction_type: 'like' | 'dislike' | 'skip' | 'view'
  /** Timestamp when the interaction occurred */
  created_at: string
  /** Display name of the user who performed the interaction */
  user_display_name: string
  /** Address of the property */
  property_address: string
  /** Price of the property */
  property_price: number
  /** Number of bedrooms in the property */
  property_bedrooms: number
  /** Number of bathrooms in the property */
  property_bathrooms: number
  /** Array of image URLs for the property */
  property_images: string[]
  /** Whether this interaction created a mutual like with another household member */
  is_mutual?: boolean
}

/**
 * Statistical summary of a household's property search activity
 * @interface CouplesStats
 */
export interface CouplesStats {
  /** Total number of properties liked by all household members */
  total_mutual_likes: number
  /** Total number of likes across the household */
  total_household_likes: number
  /** Number of consecutive days with activity */
  activity_streak_days: number
  /** Timestamp of the most recent mutual like, or null if none */
  last_mutual_like_at: string | null
}

/**
 * LRU Cache for storing mutual likes data
 * @constant
 * @description Caches mutual likes for 5 minutes to reduce database queries
 */
const mutualLikesCache = new LRUCache<string, MutualLike[]>({
  max: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
})

/**
 * LRU Cache for storing household activity timeline
 * @constant
 * @description Caches household activity for 2 minutes for quick timeline access
 */
const householdActivityCache = new LRUCache<string, HouseholdActivity[]>({
  max: 500,
  ttl: 2 * 60 * 1000, // 2 minutes
})

/**
 * LRU Cache for storing household statistics
 * @constant
 * @description Caches household stats for 10 minutes to optimize dashboard loading
 */
const householdStatsCache = new LRUCache<string, CouplesStats>({
  max: 1000,
  ttl: 10 * 60 * 1000, // 10 minutes
})

/**
 * Service class for managing household property interactions and couples' features
 * @class CouplesService
 * @description Provides methods for tracking mutual likes, household activity, and statistics
 * for couples searching for properties together. Uses caching for performance optimization.
 */
export class CouplesService {
  /**
   * Clears all cached data for a specific household
   * @param {string} householdId - The unique identifier of the household
   * @description Should be called when interactions change to ensure fresh data
   * @complexity O(1)
   */
  static clearHouseholdCache(householdId: string): void {
    mutualLikesCache.delete(householdId)
    householdActivityCache.delete(`activity_${householdId}`)
    householdStatsCache.delete(`stats_${householdId}`)
  }

  /**
   * Retrieves the household ID for a given user
   * @private
   * @param {SupabaseClient} supabase - Supabase client instance
   * @param {string} userId - The unique identifier of the user
   * @returns {Promise<string | null>} The household ID or null if user has no household
   * @complexity O(1) - Single database query
   * @description Fetches household association from user_profiles table
   */
  private static async getUserHousehold(
    supabase: SupabaseClient,
    userId: string
  ): Promise<string | null> {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('household_id')
      .eq('id', userId)
      .single()

    return userProfile?.household_id || null
  }

  /**
   * Executes RPC query to fetch mutual likes from database
   * @private
   */
  private static async fetchMutualLikesFromRPC(
    supabase: SupabaseClient,
    householdId: string
  ): Promise<{ data: unknown[]; error?: unknown }> {
    const { data: mutualLikesData, error } = await supabase.rpc(
      'get_household_mutual_likes',
      {
        p_household_id: householdId,
      }
    )

    return { data: mutualLikesData || [], error }
  }

  /**
   * Transforms raw mutual likes data from database to typed interface
   * @private
   */
  private static transformMutualLikesData(rawData: unknown[]): MutualLike[] {
    // Define interface for the raw data from the RPC function
    interface MutualLikeRaw {
      property_id: string
      liked_by_count: string | number // Database might return as string
      first_liked_at: string
      last_liked_at: string
      user_ids?: string[]
    }

    return rawData.map((item) => {
      const typedItem = item as MutualLikeRaw
      return {
        property_id: typedItem.property_id,
        liked_by_count:
          typeof typedItem.liked_by_count === 'string'
            ? parseInt(typedItem.liked_by_count, 10)
            : typedItem.liked_by_count,
        first_liked_at: typedItem.first_liked_at,
        last_liked_at: typedItem.last_liked_at,
        user_ids: typedItem.user_ids || [],
      }
    })
  }

  /**
   * Handles cache operations for mutual likes
   * @private
   */
  private static handleMutualLikesCache(
    householdId: string,
    result: MutualLike[],
    _startTime: number
  ): void {
    mutualLikesCache.set(householdId, result)
  }

  /**
   * Retrieves all properties that have been liked by multiple household members
   * @param {SupabaseClient} supabase - Supabase client instance
   * @param {string} userId - The unique identifier of the requesting user
   * @returns {Promise<MutualLike[]>} Array of mutual likes with metadata
   * @complexity O(n) where n is the number of mutual likes
   * @description Uses optimized RPC function with fallback to manual aggregation.
   * Results are cached for 5 minutes to improve performance.
   * @callsTo get_household_mutual_likes (RPC), getMutualLikesFallback (fallback)
   */
  static async getMutualLikes(
    supabase: SupabaseClient,
    userId: string
  ): Promise<MutualLike[]> {
    const startTime = Date.now()

    try {
      const householdId = await this.getUserHousehold(supabase, userId)
      if (!householdId) return []

      // Check cache first
      const cached = mutualLikesCache.get(householdId)
      if (cached) {
        return cached
      }

      // Fetch from database using RPC
      const { data: mutualLikesData, error } =
        await this.fetchMutualLikesFromRPC(supabase, householdId)

      if (error) {
        console.error('[CouplesService] Error fetching mutual likes:', error)
        // Fallback to the original method if RPC fails
        return this.getMutualLikesFallback(supabase, householdId)
      }

      // Transform and cache the result
      const result = this.transformMutualLikesData(mutualLikesData)
      this.handleMutualLikesCache(householdId, result, startTime)

      return result
    } catch (error) {
      console.error(
        '[CouplesService] Unexpected error in getMutualLikes:',
        error
      )
      return []
    }
  }

  /**
   * Fallback implementation for retrieving mutual likes using client-side aggregation
   * @private
   * @param {SupabaseClient} supabase - Supabase client instance
   * @param {string} householdId - The unique identifier of the household
   * @returns {Promise<MutualLike[]>} Array of mutual likes with metadata
   * @complexity O(n*m) where n is likes and m is unique properties
   * @description Manual aggregation when RPC function is unavailable.
   * Groups interactions by property and filters for 2+ unique users.
   */
  private static async getMutualLikesFallback(
    supabase: SupabaseClient,
    householdId: string
  ): Promise<MutualLike[]> {
    const { data: likesWithUsers } = await supabase
      .from('user_property_interactions')
      .select('property_id, user_id, created_at')
      .eq('household_id', householdId)
      .eq('interaction_type', 'like')

    if (!likesWithUsers) return []

    // Group by property_id and count unique users
    const propertyLikes = new Map<
      string,
      {
        users: Set<string>
        firstLiked: string
        lastLiked: string
      }
    >()

    likesWithUsers.forEach((like) => {
      if (!propertyLikes.has(like.property_id)) {
        propertyLikes.set(like.property_id, {
          users: new Set(),
          firstLiked: like.created_at,
          lastLiked: like.created_at,
        })
      }

      const prop = propertyLikes.get(like.property_id)!
      prop.users.add(like.user_id)

      if (like.created_at < prop.firstLiked) {
        prop.firstLiked = like.created_at
      }
      if (like.created_at > prop.lastLiked) {
        prop.lastLiked = like.created_at
      }
    })

    // Filter to only properties liked by 2+ users
    const mutualLikesList: MutualLike[] = []
    propertyLikes.forEach((value, propertyId) => {
      if (value.users.size >= 2) {
        mutualLikesList.push({
          property_id: propertyId,
          liked_by_count: value.users.size,
          first_liked_at: value.firstLiked,
          last_liked_at: value.lastLiked,
          user_ids: Array.from(value.users),
        })
      }
    })

    return mutualLikesList
  }

  /**
   * Fetches raw household activity data from database
   * @private
   */
  private static async fetchHouseholdActivityData(
    supabase: SupabaseClient,
    householdId: string,
    limit: number,
    offset: number
  ): Promise<unknown[]> {
    const { data: activities, error } = await supabase.rpc(
      'get_household_activity_enhanced',
      {
        p_household_id: householdId,
        p_limit: limit,
        p_offset: offset,
      }
    )

    if (error) {
      console.error(
        '[CouplesService] Error fetching household activity:',
        error
      )
      return []
    }

    return activities || []
  }

  /**
   * Creates a set of property IDs that have mutual likes
   * @private
   */
  private static async getMutualPropertyIds(
    supabase: SupabaseClient,
    userId: string
  ): Promise<Set<string>> {
    const mutualLikes = await this.getMutualLikes(supabase, userId)
    return new Set(mutualLikes.map((ml) => ml.property_id))
  }

  /**
   * Transforms raw activity data to typed HouseholdActivity objects
   * @private
   */
  private static transformHouseholdActivityData(
    rawActivities: unknown[],
    mutualPropertyIds: Set<string>
  ): HouseholdActivity[] {
    // Define interface for the raw activity data from the database
    interface HouseholdActivityRaw {
      id: string
      user_id: string
      property_id: string
      interaction_type: string
      created_at: string
      user_display_name?: string
      user_email?: string
      property_address?: string
      property_price?: number
      property_bedrooms?: number
      property_bathrooms?: number
      property_images?: string[]
    }

    return rawActivities.map((activity) => {
      const typedActivity = activity as HouseholdActivityRaw
      return {
        id: typedActivity.id,
        user_id: typedActivity.user_id,
        property_id: typedActivity.property_id,
        interaction_type: typedActivity.interaction_type as
          | 'like'
          | 'dislike'
          | 'skip'
          | 'view',
        created_at: typedActivity.created_at,
        user_display_name: typedActivity.user_display_name || 'Unknown',
        property_address: typedActivity.property_address || '',
        property_price: typedActivity.property_price || 0,
        property_bedrooms: typedActivity.property_bedrooms || 0,
        property_bathrooms: typedActivity.property_bathrooms || 0,
        property_images: typedActivity.property_images || [],
        is_mutual:
          typedActivity.interaction_type === 'like' &&
          mutualPropertyIds.has(typedActivity.property_id),
      }
    })
  }

  /**
   * Handles caching for household activity data
   * @private
   */
  private static handleActivityCache(
    cacheKey: string,
    result: HouseholdActivity[],
    _householdId: string,
    _startTime: number
  ): void {
    householdActivityCache.set(cacheKey, result)
  }

  /**
   * Retrieves recent household activity timeline with property details
   * @param {SupabaseClient} supabase - Supabase client instance
   * @param {string} userId - The unique identifier of the requesting user
   * @param {number} [limit=20] - Maximum number of activities to retrieve
   * @param {number} [offset=0] - Number of records to skip for pagination
   * @returns {Promise<HouseholdActivity[]>} Array of household activities with property metadata
   * @complexity O(n) where n is the number of activities
   * @description Fetches household member interactions with properties, including
   * property details and mutual like indicators. Results are cached for 2 minutes.
   * @callsTo get_household_activity_enhanced (RPC), getMutualLikes
   */
  static async getHouseholdActivity(
    supabase: SupabaseClient,
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<HouseholdActivity[]> {
    const startTime = Date.now()

    try {
      const householdId = await this.getUserHousehold(supabase, userId)
      if (!householdId) return []

      const cacheKey = `activity_${householdId}_${limit}_${offset}`

      // Check cache first
      const cached = householdActivityCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Fetch data and prepare mutual likes lookup
      const [activities, mutualPropertyIds] = await Promise.all([
        this.fetchHouseholdActivityData(supabase, householdId, limit, offset),
        this.getMutualPropertyIds(supabase, userId),
      ])

      // Transform and cache the result
      const result = this.transformHouseholdActivityData(
        activities,
        mutualPropertyIds
      )
      this.handleActivityCache(cacheKey, result, householdId, startTime)

      return result
    } catch (error) {
      console.error(
        '[CouplesService] Unexpected error in getHouseholdActivity:',
        error
      )
      return []
    }
  }

  /**
   * Calculates comprehensive statistics for a household's property search activity
   * @param {SupabaseClient} supabase - Supabase client instance
   * @param {string} userId - The unique identifier of the requesting user
   * @returns {Promise<CouplesStats | null>} Household statistics or null if no household
   * @complexity O(n) where n is the number of interactions
   * @description Aggregates mutual likes, total likes, and activity streaks.
   * Implements streak calculation based on consecutive days of activity.
   * Results are cached for 10 minutes.
   * @callsTo getMutualLikes
   */
  static async getHouseholdStats(
    supabase: SupabaseClient,
    userId: string
  ): Promise<CouplesStats | null> {
    try {
      const householdId = await this.getUserHousehold(supabase, userId)
      if (!householdId) return null

      const cacheKey = `stats_${householdId}`

      // Check cache first
      const cached = householdStatsCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Get mutual likes and total household likes
      const mutualLikes = await this.getMutualLikes(supabase, userId)

      const { count: totalHouseholdLikes } = await supabase
        .from('user_property_interactions')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('interaction_type', 'like')

      // Calculate activity streak
      const { data: recentActivity } = await supabase
        .from('user_property_interactions')
        .select('created_at')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(30)

      let streakDays = 0
      if (recentActivity && recentActivity.length > 0) {
        const dates = [
          ...new Set(
            recentActivity.map(
              (a) => new Date(a.created_at).toISOString().split('T')[0]
            )
          ),
        ]
          .sort()
          .reverse()
        const today = new Date().toISOString().split('T')[0]

        if (
          dates[0] === today ||
          dates[0] ===
            new Date(Date.now() - 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
        ) {
          for (let i = 0; i < dates.length; i++) {
            const expectedDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0]
            if (dates[i] === expectedDate) {
              streakDays++
            } else {
              break
            }
          }
        }
      }

      const result: CouplesStats = {
        total_mutual_likes: mutualLikes.length,
        total_household_likes: totalHouseholdLikes || 0,
        activity_streak_days: streakDays,
        last_mutual_like_at:
          mutualLikes.length > 0
            ? mutualLikes.sort(
                (a, b) =>
                  new Date(b.last_liked_at).getTime() -
                  new Date(a.last_liked_at).getTime()
              )[0].last_liked_at
            : null,
      }

      // Cache the result
      householdStatsCache.set(cacheKey, result)

      return result
    } catch (error) {
      console.error(
        '[CouplesService] Unexpected error in getHouseholdStats:',
        error
      )
      return null
    }
  }

  /**
   * Checks if liking a property would create a mutual like with another household member
   * @param {SupabaseClient} supabase - Supabase client instance
   * @param {string} userId - The unique identifier of the user considering the like
   * @param {string} propertyId - The unique identifier of the property
   * @returns {Promise<{ wouldBeMutual: boolean; partnerUserId?: string }>}
   * Object indicating if mutual like would be created and which partner liked it
   * @complexity O(1) - Single database query
   * @description Pre-checks if an interaction would result in a mutual like,
   * useful for UI feedback and notifications.
   */
  static async checkPotentialMutualLike(
    supabase: SupabaseClient,
    userId: string,
    propertyId: string
  ): Promise<{ wouldBeMutual: boolean; partnerUserId?: string }> {
    try {
      const householdId = await this.getUserHousehold(supabase, userId)
      if (!householdId) return { wouldBeMutual: false }

      // Check if any other household member has already liked this property
      const { data: existingLikes } = await supabase
        .from('user_property_interactions')
        .select('user_id')
        .eq('household_id', householdId)
        .eq('property_id', propertyId)
        .eq('interaction_type', 'like')
        .neq('user_id', userId)

      if (existingLikes && existingLikes.length > 0) {
        return {
          wouldBeMutual: true,
          partnerUserId: existingLikes[0].user_id,
        }
      }

      return { wouldBeMutual: false }
    } catch (error) {
      console.error(
        '[CouplesService] Error checking potential mutual like:',
        error
      )
      return { wouldBeMutual: false }
    }
  }

  /**
   * Handles notification logic when a user interacts with a property
   * @param {SupabaseClient} supabase - Supabase client instance
   * @param {string} userId - The unique identifier of the user who interacted
   * @param {string} propertyId - The unique identifier of the property
   * @param {string} interactionType - Type of interaction (like, dislike, skip, view)
   * @returns {Promise<void>}
   * @complexity O(1)
   * @description Clears household cache and checks for mutual like creation.
   * Can be extended to trigger real-time notifications to household members.
   * @callsTo clearHouseholdCache, checkPotentialMutualLike
   */
  static async notifyInteraction(
    supabase: SupabaseClient,
    userId: string,
    propertyId: string,
    interactionType: string
  ): Promise<void> {
    try {
      const householdId = await this.getUserHousehold(supabase, userId)
      if (!householdId) return

      // Clear cache to ensure fresh data
      this.clearHouseholdCache(householdId)

      // If it's a like, check if it creates a mutual like
      if (interactionType === 'like') {
        const { wouldBeMutual, partnerUserId } =
          await this.checkPotentialMutualLike(supabase, userId, propertyId)

        if (wouldBeMutual && partnerUserId) {
          // Here you could trigger real-time notifications to the partner
          // await this.sendRealtimeNotification(partnerUserId, 'mutual_like_created', { propertyId, partnerUserId: userId })
        }
      }
    } catch (error) {
      console.error('[CouplesService] Error in notifyInteraction:', error)
    }
  }
}
