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
    { propertyId: string; type: InteractionType }
  >({
    mutationFn: ({ propertyId, type }) =>
      InteractionService.recordInteraction(propertyId, type),
    
    // After the mutation is successful, invalidate the summary query to refetch fresh counts.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.summaries() })
    },
    // Optional: onError handling for logging or showing toast notifications.
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
      InteractionService.getInteractions(type, { cursor: pageParam as string | undefined }),
    getNextPageParam: lastPage => lastPage.nextCursor,
    initialPageParam: undefined,
  })
}
