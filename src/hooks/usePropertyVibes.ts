'use client'

import { useQuery } from '@tanstack/react-query'
import type { PropertyVibes } from '@/lib/schemas/property-vibes'
import { QUERY_STALE_TIMES } from '@/lib/query/config'

// Query keys for property vibes
export const vibesKeys = {
  all: ['property-vibes'] as const,
  property: (propertyId: string) => [...vibesKeys.all, propertyId] as const,
}

// API response type matching /api/properties/vibes endpoint
interface VibesApiResponse {
  data: PropertyVibes[] | null
}

/**
 * Fetches vibes for a single property by ID.
 * Returns null if no vibes exist for the property.
 */
export function usePropertyVibes(propertyId: string | undefined) {
  return useQuery<PropertyVibes | null, Error>({
    queryKey: propertyId ? vibesKeys.property(propertyId) : ['disabled'],
    queryFn: async () => {
      if (!propertyId) return null

      const response = await fetch(
        `/api/properties/vibes?propertyId=${propertyId}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch property vibes')
      }

      const result: VibesApiResponse = await response.json()
      // The API returns an array, but for a single propertyId we get at most one result
      return result.data?.[0] ?? null
    },
    enabled: !!propertyId,
    staleTime: QUERY_STALE_TIMES.PROPERTY_VIBES,
  })
}

/**
 * Fetches vibes for multiple properties in a single request.
 * Useful for prefetching vibes for a list of properties.
 */
export function usePropertyVibesList(limit = 20, offset = 0) {
  return useQuery<PropertyVibes[], Error>({
    queryKey: [...vibesKeys.all, 'list', limit, offset],
    queryFn: async () => {
      const response = await fetch(
        `/api/properties/vibes?limit=${limit}&offset=${offset}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch property vibes list')
      }

      const result: VibesApiResponse = await response.json()
      return result.data ?? []
    },
    staleTime: QUERY_STALE_TIMES.PROPERTY_VIBES,
  })
}
