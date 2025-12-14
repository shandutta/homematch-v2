import { QueryClient } from '@tanstack/react-query'

export const QUERY_STALE_TIMES = {
  INTERACTION_SUMMARY: 5 * 60 * 1000, // 5 minutes
  PROPERTY_LIST: 10 * 60 * 1000, // 10 minutes
  PROPERTY_VIBES: 30 * 60 * 1000, // 30 minutes - vibes don't change often
  NEIGHBORHOOD_VIBES: 30 * 60 * 1000, // 30 minutes - neighborhood vibes are mostly static
  USER_PROFILE: 30 * 60 * 1000, // 30 minutes
  STATIC_DATA: 60 * 60 * 1000, // 1 hour
} as const

export const QUERY_CACHE_TIMES = {
  DEFAULT: 10 * 60 * 1000, // 10 minutes
  EXTENDED: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000, // 1 hour
} as const

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIMES.PROPERTY_LIST,
        gcTime: QUERY_CACHE_TIMES.DEFAULT,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  })
}
