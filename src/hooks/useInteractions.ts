'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
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

export const summaryKeyForInteraction: Record<
  InteractionType,
  keyof InteractionSummary
> = {
  liked: 'liked',
  viewed: 'viewed',
  skip: 'passed',
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
      const summaryKey = summaryKeyForInteraction[type]

      if (previousSummary && summaryKey) {
        queryClient.setQueryData<InteractionSummary>(
          interactionKeys.summaries(),
          {
            ...previousSummary,
            [summaryKey]: previousSummary[summaryKey] + 1,
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
    onSettled: (_data, _error, { type }) => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.summaries() })
      // Invalidate the target list so it refetches (e.g., Liked page after liking)
      queryClient.invalidateQueries({ queryKey: interactionKeys.list(type) })
      // Also invalidate viewed list since the property may have been moved from there
      queryClient.invalidateQueries({ queryKey: interactionKeys.list('viewed') })
    },
  })
}

/**
 * Deletes an interaction (e.g., remove from liked list) and updates cached data.
 */
export function useDeleteInteraction(type: InteractionType) {
  const queryClient = useQueryClient()

  return useMutation<
    unknown,
    Error,
    { propertyId: string },
    {
      previousSummary?: InteractionSummary
      previousList?: InfiniteData<PageResponse<Property>>
    }
  >({
    mutationFn: ({ propertyId }) =>
      InteractionService.deleteInteraction(propertyId),
    onMutate: async ({ propertyId }) => {
      await queryClient.cancelQueries({ queryKey: interactionKeys.summaries() })
      await queryClient.cancelQueries({ queryKey: interactionKeys.list(type) })

      const previousSummary = queryClient.getQueryData<InteractionSummary>(
        interactionKeys.summaries()
      )
      const previousList = queryClient.getQueryData<
        InfiniteData<PageResponse<Property>>
      >(interactionKeys.list(type))

      if (previousSummary) {
        const summaryKey = summaryKeyForInteraction[type]
        queryClient.setQueryData<InteractionSummary>(
          interactionKeys.summaries(),
          {
            ...previousSummary,
            [summaryKey]: Math.max(previousSummary[summaryKey] - 1, 0),
          }
        )
      }

      if (previousList) {
        queryClient.setQueryData(interactionKeys.list(type), {
          ...previousList,
          pages: previousList.pages.map((page) => ({
            ...page,
            items: page.items.filter((property) => property.id !== propertyId),
          })),
        })
      }

      return { previousSummary, previousList }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSummary) {
        queryClient.setQueryData(
          interactionKeys.summaries(),
          context.previousSummary
        )
      }
      if (context?.previousList) {
        queryClient.setQueryData(
          interactionKeys.list(type),
          context.previousList
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.summaries() })
      queryClient.invalidateQueries({ queryKey: interactionKeys.list(type) })
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
