'use client'

import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIMES } from '@/lib/query/config'

export interface MutualLike {
  property_id: string
  property?: {
    address: string
    price: number
    bedrooms: number
    bathrooms: number
    image_urls?: string[]
  }
  liked_by_count: number
  first_liked_at: string
  last_liked_at: string
}

// Centralized query keys for couples functionality
export const couplesKeys = {
  all: ['couples'] as const,
  mutualLikes: () => [...couplesKeys.all, 'mutual-likes'] as const,
  activity: () => [...couplesKeys.all, 'activity'] as const,
}

/**
 * Fetches mutual likes for the current user's household
 */
export function useMutualLikes() {
  return useQuery<MutualLike[], Error>({
    queryKey: couplesKeys.mutualLikes(),
    queryFn: async () => {
      const response = await fetch('/api/couples/mutual-likes')
      if (!response.ok) {
        throw new Error('Failed to fetch mutual likes')
      }
      const data = await response.json()
      return data.mutualLikes || []
    },
    staleTime: QUERY_STALE_TIMES.INTERACTION_SUMMARY, // Same as interactions for consistency
    enabled: typeof window !== 'undefined', // Only run on client side
  })
}

/**
 * Helper hook to check if a property has been mutually liked
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
