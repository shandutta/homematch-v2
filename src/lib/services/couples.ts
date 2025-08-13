import { LRUCache } from 'lru-cache'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface MutualLike {
  property_id: string
  liked_by_count: number
  first_liked_at: string
  last_liked_at: string
  user_ids: string[] // Track which users liked it
}

export interface HouseholdActivity {
  id: string
  user_id: string
  property_id: string
  interaction_type: 'like' | 'dislike' | 'skip' | 'view'
  created_at: string
  user_display_name: string
  user_email: string
  property_address: string
  property_price: number
  property_bedrooms: number
  property_bathrooms: number
  property_images: string[]
  is_mutual?: boolean // If this action created a mutual like
}

export interface CouplesStats {
  total_mutual_likes: number
  total_household_likes: number
  activity_streak_days: number
  last_mutual_like_at: string | null
}

// Cache configuration
const mutualLikesCache = new LRUCache<string, MutualLike[]>({
  max: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
})

const householdActivityCache = new LRUCache<string, HouseholdActivity[]>({
  max: 500,
  ttl: 2 * 60 * 1000, // 2 minutes
})

const householdStatsCache = new LRUCache<string, CouplesStats>({
  max: 1000,
  ttl: 10 * 60 * 1000, // 10 minutes
})

export class CouplesService {
  /**
   * Clear cache for a household when interactions change
   */
  static clearHouseholdCache(householdId: string): void {
    mutualLikesCache.delete(householdId)
    householdActivityCache.delete(`activity_${householdId}`)
    householdStatsCache.delete(`stats_${householdId}`)
  }

  /**
   * Get user's household ID efficiently
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
   * Optimized query to get mutual likes using a single database call with aggregation
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
        console.log(
          `[CouplesService] Cache hit for mutual likes: ${householdId} (${Date.now() - startTime}ms)`
        )
        return cached
      }

      // Optimized single query with aggregation
      const { data: mutualLikesData, error } = await supabase.rpc(
        'get_household_mutual_likes',
        {
          p_household_id: householdId,
        }
      )

      if (error) {
        console.error('[CouplesService] Error fetching mutual likes:', error)

        // Fallback to the original method if RPC fails
        return this.getMutualLikesFallback(supabase, householdId)
      }

      // Define interface for the raw data from the RPC function
      interface MutualLikeRaw {
        property_id: string
        liked_by_count: string | number // Database might return as string
        first_liked_at: string
        last_liked_at: string
        user_ids?: string[]
      }

      const result = (mutualLikesData || []).map((item: MutualLikeRaw) => ({
        property_id: item.property_id,
        liked_by_count:
          typeof item.liked_by_count === 'string'
            ? parseInt(item.liked_by_count)
            : item.liked_by_count,
        first_liked_at: item.first_liked_at,
        last_liked_at: item.last_liked_at,
        user_ids: item.user_ids || [],
      }))

      // Cache the result
      mutualLikesCache.set(householdId, result)

      console.log(
        `[CouplesService] Fetched ${result.length} mutual likes for household ${householdId} (${Date.now() - startTime}ms)`
      )
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
   * Fallback method using the original approach
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
   * Get recent household activity timeline with enhanced data
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
        console.log(
          `[CouplesService] Cache hit for activity: ${cacheKey} (${Date.now() - startTime}ms)`
        )
        return cached
      }

      // Use the optimized database function
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

      // Get mutual likes to mark which activities created mutual likes
      const mutualLikes = await this.getMutualLikes(supabase, userId)
      const mutualPropertyIds = new Set(mutualLikes.map((ml) => ml.property_id))

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

      const result: HouseholdActivity[] = (activities || []).map(
        (activity: HouseholdActivityRaw) => ({
          id: activity.id,
          user_id: activity.user_id,
          property_id: activity.property_id,
          interaction_type: activity.interaction_type as
            | 'like'
            | 'dislike'
            | 'skip'
            | 'view',
          created_at: activity.created_at,
          user_display_name: activity.user_display_name || 'Unknown',
          user_email: activity.user_email || '',
          property_address: activity.property_address || '',
          property_price: activity.property_price || 0,
          property_bedrooms: activity.property_bedrooms || 0,
          property_bathrooms: activity.property_bathrooms || 0,
          property_images: activity.property_images || [],
          is_mutual:
            activity.interaction_type === 'like' &&
            mutualPropertyIds.has(activity.property_id),
        })
      )

      // Cache the result
      householdActivityCache.set(cacheKey, result)

      console.log(
        `[CouplesService] Fetched ${result.length} activities for household ${householdId} (${Date.now() - startTime}ms)`
      )
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
   * Get household statistics
   */
  static async getHouseholdStats(
    supabase: SupabaseClient,
    userId: string
  ): Promise<CouplesStats | null> {
    const startTime = Date.now()

    try {
      const householdId = await this.getUserHousehold(supabase, userId)
      if (!householdId) return null

      const cacheKey = `stats_${householdId}`

      // Check cache first
      const cached = householdStatsCache.get(cacheKey)
      if (cached) {
        console.log(
          `[CouplesService] Cache hit for stats: ${cacheKey} (${Date.now() - startTime}ms)`
        )
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

      console.log(
        `[CouplesService] Generated stats for household ${householdId} (${Date.now() - startTime}ms)`
      )
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
   * Check if a property interaction would create a mutual like
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
   * Notify when interactions happen (for real-time updates)
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
          console.log(
            `[CouplesService] Mutual like created: ${userId} + ${partnerUserId} for property ${propertyId}`
          )
          // Here you could trigger real-time notifications to the partner
          // await this.sendRealtimeNotification(partnerUserId, 'mutual_like_created', { propertyId, partnerUserId: userId })
        }
      }
    } catch (error) {
      console.error('[CouplesService] Error in notifyInteraction:', error)
    }
  }
}
