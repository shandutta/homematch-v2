'use client'

import { useQuery } from '@tanstack/react-query'
import { QUERY_STALE_TIMES } from '@/lib/query/config'
import type { NeighborhoodVibesRecord } from '@/lib/schemas/neighborhood-vibes'

const neighborhoodVibesAllKey: readonly ['neighborhood-vibes'] = [
  'neighborhood-vibes',
]
const buildNeighborhoodVibeKey = (
  id: string
): readonly ['neighborhood-vibes', string] => [neighborhoodVibesAllKey[0], id]

const neighborhoodVibeKeys = {
  all: neighborhoodVibesAllKey,
  neighborhood: buildNeighborhoodVibeKey,
}

interface NeighborhoodVibesApiResponse {
  data: NeighborhoodVibesRecord[] | null
}

export function useNeighborhoodVibes(neighborhoodId: string | undefined) {
  return useQuery<NeighborhoodVibesRecord | null, Error>({
    queryKey: neighborhoodId
      ? neighborhoodVibeKeys.neighborhood(neighborhoodId)
      : ['disabled'],
    queryFn: async () => {
      if (!neighborhoodId) return null
      const response = await fetch(
        `/api/neighborhoods/vibes?neighborhoodId=${neighborhoodId}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch neighborhood vibes')
      }

      const result: NeighborhoodVibesApiResponse = await response.json()
      return result.data?.[0] ?? null
    },
    enabled: !!neighborhoodId,
    staleTime: QUERY_STALE_TIMES.NEIGHBORHOOD_VIBES,
  })
}

export function useNeighborhoodVibesList(limit = 20, offset = 0) {
  return useQuery<NeighborhoodVibesRecord[], Error>({
    queryKey: [...neighborhoodVibeKeys.all, 'list', limit, offset],
    queryFn: async () => {
      const response = await fetch(
        `/api/neighborhoods/vibes?limit=${limit}&offset=${offset}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch neighborhood vibes list')
      }

      const result: NeighborhoodVibesApiResponse = await response.json()
      return result.data ?? []
    },
    staleTime: QUERY_STALE_TIMES.NEIGHBORHOOD_VIBES,
  })
}
