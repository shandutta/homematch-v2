'use client'

import { createClient } from '@/lib/supabase/client'
import type { Neighborhood } from '@/types/database'
import { buildCityStateKeys, type CityStatePair } from '@/lib/utils/postgrest'

export type CityOption = CityStatePair
export type NeighborhoodOption = Pick<
  Neighborhood,
  'id' | 'name' | 'city' | 'state' | 'bounds'
>

export type MapNeighborhoodResponse = {
  neighborhoods: NeighborhoodOption[]
  precomputed: boolean
}

export class LocationsClient {
  static async getCities(): Promise<CityOption[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('neighborhoods')
      .select('city,state')
      .order('city')
      .order('state')

    if (error) {
      throw new Error(`Failed to load cities: ${error.message}`)
    }

    const deduped = new Map<string, CityOption>()
    for (const row of data || []) {
      const city = row.city?.trim()
      const state = row.state?.trim()
      if (!city || !state) continue

      const key = `${city.toLowerCase()}|${state.toLowerCase()}`
      if (!deduped.has(key)) {
        deduped.set(key, { city, state })
      }
    }

    return Array.from(deduped.values())
  }

  static async getNeighborhoodsForCities(
    cities: CityOption[]
  ): Promise<NeighborhoodOption[]> {
    if (!cities.length) return []

    const supabase = createClient()

    const cityStateKeys = buildCityStateKeys(cities)
    if (cityStateKeys.length === 0) return []

    let query = supabase
      .from('neighborhoods')
      .select('id,name,city,state,bounds')
      .order('name')

    if (cityStateKeys.length === 1) {
      query = query.eq('city_state_key', cityStateKeys[0]!)
    } else {
      query = query.in('city_state_key', cityStateKeys)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to load neighborhoods: ${error.message}`)
    }

    return data || []
  }

  static async getNeighborhoodsForMetroArea(
    query: string
  ): Promise<NeighborhoodOption[]> {
    const trimmed = query.trim()
    if (!trimmed) return []

    const supabase = createClient()

    const { data, error } = await supabase
      .from('neighborhoods')
      .select('id,name,city,state,bounds')
      .eq('metro_area', trimmed)
      .order('name')

    if (error) {
      throw new Error(`Failed to load neighborhoods: ${error.message}`)
    }

    return data || []
  }

  static async getMapNeighborhoodsForMetroArea(
    query: string
  ): Promise<MapNeighborhoodResponse> {
    const trimmed = query.trim()
    if (!trimmed) return { neighborhoods: [], precomputed: false }

    const response = await fetch(
      `/api/maps/metro-boundaries?metro=${encodeURIComponent(trimmed)}`,
      {
        method: 'GET',
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to load map neighborhoods: ${response.status}`)
    }

    const data: unknown = await response.json()
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null
    const isNeighborhoodOption = (
      value: unknown
    ): value is NeighborhoodOption =>
      isRecord(value) &&
      typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      typeof value.city === 'string' &&
      typeof value.state === 'string'

    const neighborhoods =
      isRecord(data) && Array.isArray(data.neighborhoods)
        ? data.neighborhoods.filter(isNeighborhoodOption)
        : []
    const precomputed =
      isRecord(data) && typeof data.precomputed === 'boolean'
        ? data.precomputed
        : false
    return {
      neighborhoods,
      precomputed,
    }
  }

  static async getMetroAreas(): Promise<string[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('neighborhoods')
      .select('metro_area')
      .not('metro_area', 'is', null)
      .order('metro_area')

    if (error) {
      throw new Error(`Failed to load metro areas: ${error.message}`)
    }

    const deduped = new Map<string, string>()
    for (const row of data || []) {
      const metro = row.metro_area?.trim()
      if (!metro) continue
      const key = metro.toLowerCase()
      if (!deduped.has(key)) deduped.set(key, metro)
    }

    return Array.from(deduped.values())
  }
}
