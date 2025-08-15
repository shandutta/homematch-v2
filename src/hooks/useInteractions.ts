'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { InteractionService } from '@/lib/services/interactions'
import { InteractionType, InteractionSummary, PageResponse } from '@/types/app'
import { Property } from '@/lib/schemas/property'
import { QUERY_STALE_TIMES } from '@/lib/query/config'

// Centralized query keys for interactions, ensures consistency.
export const interactionKeys = {
  all: ['interactions'] as const,
  summaries: () => [...interactionKeys.all, 'summary'] as const,
  lists: () => [...interactionKeys.all, 'list'] as const,
  list: (type: InteractionType) => [...interactionKeys.lists(), type] as const,
}

/**
 * Fetches the interaction summary (counts of liked, passed, viewed) for the current user.
 */
export function useInteractionSummary() {
  return useQuery<InteractionSummary, Error>({
    queryKey: interactionKeys.summaries(),
    queryFn: () => InteractionService.getInteractionSummary(),
    staleTime: QUERY_STALE_TIMES.INTERACTION_SUMMARY,
  })
}

/**
 * Provides a mutation function to record a user's interaction (like/pass).
 * Handles optimistic updates and invalidates summary data to refetch.
 */
export function useRecordInteraction() {
  const queryClient = useQueryClient()

  return useMutation<
    unknown,
    Error,
    { propertyId: string; type: InteractionType },
    { previousSummary: InteractionSummary | undefined }
  >({
    mutationFn: ({ propertyId, type }) =>
      InteractionService.recordInteraction(propertyId, type),

    // Optimistic update
    onMutate: async ({ type }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: interactionKeys.summaries() })

      // Snapshot the previous value
      const previousSummary = queryClient.getQueryData<InteractionSummary>(
        interactionKeys.summaries()
      )

      // Optimistically update
      if (previousSummary) {
        queryClient.setQueryData<InteractionSummary>(
          interactionKeys.summaries(),
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

    // If mutation fails, rollback
    onError: (err, variables, context) => {
      if (context?.previousSummary) {
        queryClient.setQueryData(
          interactionKeys.summaries(),
          context.previousSummary
        )
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.summaries() })
    },
  })
}

/**
 * Fetches a paginated list of properties for a given interaction type.
 * Supports infinite scrolling.
 */
export function useInfiniteInteractions(type: InteractionType) {
  return useInfiniteQuery<PageResponse<Property>, Error>({
    queryKey: interactionKeys.list(type),
    queryFn: ({ pageParam }) =>
      InteractionService.getInteractions(type, {
        cursor: pageParam as string | undefined,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    staleTime: QUERY_STALE_TIMES.PROPERTY_LIST,
  })
}
