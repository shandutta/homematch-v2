/**
 * @module useCouples
 * @description React hooks for managing couples' shared property interactions and mutual likes.
 * Provides client-side data fetching and caching for household property decisions.
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIMES } from '@/lib/query/config'
import type { HouseholdActivity } from '@/lib/services/couples'

/**
 * Represents a property that has been liked by multiple household members
 * @interface MutualLike
 */
export interface MutualLike {
  /** Unique identifier of the property */
  property_id: string
  /** Optional property details if included in the response */
  property?: {
    /** Street address of the property */
    address: string
    /** Listed price of the property */
    price: number
    /** Number of bedrooms */
    bedrooms: number
    /** Number of bathrooms */
    bathrooms: number
    /** Array of property image URLs (current payload) */
    images?: string[]
    /** Array of property image URLs */
    image_urls?: string[]
  }
  /** Number of household members who liked this property */
  liked_by_count: number
  /** ISO timestamp when first liked by any household member */
  first_liked_at: string
  /** ISO timestamp when most recently liked by any household member */
  last_liked_at: string
}

/**
 * Centralized query keys for couples functionality
 * @constant
 * @description Provides consistent cache keys for React Query to manage couples-related data
 */
export const couplesKeys = {
  /** Base key for all couples-related queries */
  all: ['couples'] as const,
  /** Query key for mutual likes data */
  mutualLikes: () => [...couplesKeys.all, 'mutual-likes'] as const,
  /** Query key for household activity timeline */
  activity: () => [...couplesKeys.all, 'activity'] as const,
}

/**
 * Hook to fetch and manage mutual likes for the current user's household
 * @returns {UseQueryResult<MutualLike[], Error>} React Query result with mutual likes data
 * @description Fetches properties that have been liked by multiple household members.
 * Data is cached and automatically refreshed based on stale time configuration.
 * Only runs on client-side to prevent SSR issues.
 * @complexity O(1) - API call with caching
 * @callsTo /api/couples/mutual-likes (GET)
 */
export function useMutualLikes() {
  return useQuery<MutualLike[], Error>({
    queryKey: couplesKeys.mutualLikes(),
    queryFn: async () => {
      const response = await fetch('/api/couples/mutual-likes', {
        credentials: 'include',
      })
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view mutual likes')
        }

        if (response.status >= 500) {
          throw new Error('Server error - please try again later')
        }

        let apiError: string | null = null
        try {
          const data = await response.json()
          if (typeof data?.error === 'string' && data.error.length > 0) {
            apiError = data.error
          }
        } catch {
          // ignore parsing errors
        }

        throw new Error(apiError ?? 'Failed to fetch mutual likes')
      }
      const data = await response.json()
      return data.mutualLikes || []
    },
    staleTime: QUERY_STALE_TIMES.INTERACTION_SUMMARY, // Same as interactions for consistency
    enabled: typeof window !== 'undefined', // Only run on client side
  })
}

/**
 * Hook to fetch and manage household activity for the current user's household
 *
 * @param {number} limit - Maximum number of activities to fetch
 * @param {number} offset - Number of records to skip for pagination
 * @returns {UseQueryResult<HouseholdActivity[], Error>} React Query result with activity data
 *
 * @description
 * Fetches the household activity timeline (likes, passes, views) for the current user.
 * Results are cached and refreshed based on stale time configuration.
 */
export function useHouseholdActivity(limit = 20, offset = 0) {
  return useQuery<HouseholdActivity[], Error>({
    queryKey: [...couplesKeys.activity(), { limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      const response = await fetch(`/api/couples/activity?${params}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view household activity')
        }

        if (response.status >= 500) {
          throw new Error('Server error - please try again later')
        }

        let apiError: string | null = null
        try {
          const data = await response.json()
          if (typeof data?.error === 'string' && data.error.length > 0) {
            apiError = data.error
          }
        } catch {
          // ignore parsing errors
        }

        throw new Error(apiError ?? 'Failed to fetch household activity')
      }

      const data = await response.json()
      return data.activity || []
    },
    staleTime: QUERY_STALE_TIMES.INTERACTION_SUMMARY,
    enabled: typeof window !== 'undefined', // Only run on client side
  })
}

/**
 * Helper hook to check if a specific property has been mutually liked
 * @param {string} propertyId - The unique identifier of the property to check
 * @returns {{ isMutuallyLiked: boolean; likedByCount: number; mutualLike: MutualLike | undefined }}
 * Object containing mutual like status and metadata
 * @description Derives mutual like status for a specific property from the cached mutual likes data.
 * Useful for displaying mutual like indicators on property cards.
 * @complexity O(n) where n is the number of mutual likes
 * @callsTo useMutualLikes (parent hook)
 */
export function useMutualLikeCheck(propertyId: string) {
  const { data: mutualLikes = [] } = useMutualLikes()

  const mutualLike = mutualLikes.find((ml) => ml.property_id === propertyId)

  return {
    isMutuallyLiked: !!mutualLike,
    likedByCount: mutualLike?.liked_by_count || 0,
    mutualLike,
  }
}
