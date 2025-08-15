'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { InteractionService } from '@/lib/services/interactions'
import { InteractionType, InteractionSummary } from '@/types/app'
import { toast } from '@/lib/utils/toast'
import { useEffect, useState } from 'react'

/**
 * Enhanced interaction hook that checks for mutual likes and provides celebrations
 */
export function useCouplesInteraction() {
  const queryClient = useQueryClient()
  const [celebrationTrigger, setCelebrationTrigger] = useState<{
    type: 'mutual-like' | 'streak' | 'milestone'
    propertyAddress?: string
    partnerName?: string
    count?: number
  } | null>(null)

  const mutation = useMutation<
    {
      success: boolean
      mutualLike?: boolean
      partnerName?: string
      propertyAddress?: string
      streak?: number
      milestone?: { type: string; count: number }
    },
    Error,
    { propertyId: string; type: InteractionType },
    { previousSummary: InteractionSummary | undefined }
  >({
    mutationFn: async ({ propertyId, type }) => {
      // Record the interaction
      await InteractionService.recordInteraction(propertyId, type)

      // Check if this creates a mutual like (if it's a 'like')
      if (type === 'liked') {
        try {
          const response = await fetch(
            `/api/couples/check-mutual?propertyId=${propertyId}`
          )
          if (response.ok) {
            const data = await response.json()
            return {
              success: true,
              mutualLike: data.isMutual,
              partnerName: data.partnerName,
              propertyAddress: data.propertyAddress,
              streak: data.streak,
              milestone: data.milestone,
            }
          }
        } catch (error) {
          console.log('Could not check for mutual like:', error)
        }
      }

      return { success: true }
    },

    // Optimistic update
    onMutate: async ({ type }) => {
      await queryClient.cancelQueries({ queryKey: ['interactions', 'summary'] })

      const previousSummary = queryClient.getQueryData<InteractionSummary>([
        'interactions',
        'summary',
      ])

      if (previousSummary) {
        queryClient.setQueryData<InteractionSummary>(
          ['interactions', 'summary'],
          {
            ...previousSummary,
            viewed: previousSummary.viewed + 1,
            liked:
              type === 'liked'
                ? previousSummary.liked + 1
                : previousSummary.liked,
            passed:
              type === 'skip'
                ? previousSummary.passed + 1
                : previousSummary.passed,
          }
        )
      }

      return { previousSummary }
    },

    // Handle success celebrations
    onSuccess: (data) => {
      if (data.mutualLike && data.propertyAddress) {
        setCelebrationTrigger({
          type: 'mutual-like',
          propertyAddress: data.propertyAddress,
          partnerName: data.partnerName,
        })

        toast.mutualLike(data.propertyAddress, data.partnerName)

        // Haptic feedback on mobile
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 200])
        }
      }

      if (data.streak && data.streak > 1) {
        setCelebrationTrigger({
          type: 'streak',
          count: data.streak,
        })

        toast.streak(data.streak)
      }

      if (data.milestone) {
        setCelebrationTrigger({
          type: 'milestone',
          count: data.milestone.count,
        })
      }

      // Clear couples cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['couples'] })
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousSummary) {
        queryClient.setQueryData(
          ['interactions', 'summary'],
          context.previousSummary
        )
      }

      toast.error('Failed to record interaction', 'Please try again')
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['interactions', 'summary'] })
    },
  })

  // Clear celebration trigger after a delay
  useEffect(() => {
    if (celebrationTrigger) {
      const timer = setTimeout(() => setCelebrationTrigger(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [celebrationTrigger])

  return {
    recordInteraction: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    celebrationTrigger,
    clearCelebration: () => setCelebrationTrigger(null),
  }
}
