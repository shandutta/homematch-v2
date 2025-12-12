import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import type {
  MutualLike,
  HouseholdActivity,
  CouplesStats,
} from '@/lib/services/couples'
import type { Property } from '@/lib/schemas/property'

interface MutualLikesResponse {
  mutualLikes: (MutualLike & { property?: Property })[]
  performance: {
    totalTime: number
    cached: boolean
    count: number
  }
}

interface HouseholdActivityResponse {
  activities: HouseholdActivity[]
  stats: CouplesStats | null
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

interface CouplesStatsResponse {
  stats: CouplesStats
}

interface NotifyInteractionResponse {
  success: boolean
  mutual_like_created: boolean
  notification_sent: boolean
  partner_user_id?: string
}

// Query keys
const COUPLES_KEYS = {
  all: ['couples'] as const,
  mutualLikes: () => [...COUPLES_KEYS.all, 'mutual-likes'] as const,
  activity: (limit?: number, offset?: number) =>
    [...COUPLES_KEYS.all, 'activity', { limit, offset }] as const,
  stats: () => [...COUPLES_KEYS.all, 'stats'] as const,
}

/**
 * Hook to fetch mutual likes with caching and performance tracking
 */
export function useMutualLikes(includeProperties = true) {
  return useQuery({
    queryKey: [...COUPLES_KEYS.mutualLikes(), { includeProperties }],
    queryFn: async (): Promise<MutualLikesResponse> => {
      const params = new URLSearchParams({
        includeProperties: includeProperties.toString(),
      })

      const response = await fetch(`/api/couples/mutual-likes?${params}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch mutual likes')
      }

      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - matches cache TTL
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch household activity timeline
 */
export function useHouseholdActivity(limit = 20, offset = 0) {
  return useQuery({
    queryKey: COUPLES_KEYS.activity(limit, offset),
    queryFn: async (): Promise<HouseholdActivityResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      const response = await fetch(`/api/couples/activity?${params}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch household activity')
      }

      return response.json()
    },
    staleTime: 1 * 60 * 1000, // 1 minute - matches cache TTL
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch household statistics
 */
export function useCouplesStats() {
  return useQuery({
    queryKey: COUPLES_KEYS.stats(),
    queryFn: async (): Promise<CouplesStatsResponse> => {
      const response = await fetch('/api/couples/stats', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch couples stats')
      }

      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - matches cache TTL
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to notify about property interactions and handle real-time updates
 */
export function useNotifyInteraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      propertyId,
      interactionType,
    }: {
      propertyId: string
      interactionType: 'like' | 'dislike' | 'skip' | 'view'
    }): Promise<NotifyInteractionResponse> => {
      const response = await fetch('/api/couples/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId,
          interactionType,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to notify interaction')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate relevant caches when interactions happen
      queryClient.invalidateQueries({ queryKey: COUPLES_KEYS.activity() })
      queryClient.invalidateQueries({ queryKey: COUPLES_KEYS.stats() })

      // If this created a mutual like, invalidate mutual likes cache
      if (data.mutual_like_created) {
        queryClient.invalidateQueries({ queryKey: COUPLES_KEYS.mutualLikes() })
      }

      // Optionally show a notification or trigger a celebration
      if (data.mutual_like_created) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🎉 Mutual like created!', data)
        }
        // You could trigger a toast notification, confetti, etc.
      }
    },
  })
}

/**
 * Hook to manually refetch all couples-related data
 */
export function useRefreshCouplesData() {
  const queryClient = useQueryClient()

  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: COUPLES_KEYS.all })
  }, [queryClient])
}

/**
 * Combined hook that provides all couples functionality
 */
export function useCouplesFeatures(options?: {
  mutualLikes?: { includeProperties?: boolean }
  activity?: { limit?: number; offset?: number }
  enableRealtime?: boolean
}) {
  const mutualLikes = useMutualLikes(options?.mutualLikes?.includeProperties)
  const activity = useHouseholdActivity(
    options?.activity?.limit,
    options?.activity?.offset
  )
  const stats = useCouplesStats()
  const notifyInteraction = useNotifyInteraction()
  const refreshData = useRefreshCouplesData()

  return {
    // Data
    mutualLikes: mutualLikes.data?.mutualLikes || [],
    activity: activity.data?.activities || [],
    stats: stats.data?.stats || null,

    // Loading states
    isLoading: mutualLikes.isLoading || activity.isLoading || stats.isLoading,
    isRefreshing:
      mutualLikes.isFetching || activity.isFetching || stats.isFetching,

    // Performance info
    performance: mutualLikes.data?.performance,

    // Actions
    notifyInteraction: notifyInteraction.mutate,
    refreshData,

    // Individual query states for granular control
    queries: {
      mutualLikes,
      activity,
      stats,
    },
  }
}
