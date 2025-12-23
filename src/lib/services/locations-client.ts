'use client'

import { createClient } from '@/lib/supabase/client'
import type { Neighborhood } from '@/types/database'
import { buildCityStateKeys, type CityStatePair } from '@/lib/utils/postgrest'

export type CityOption = CityStatePair
export type NeighborhoodOption = Pick<
  Neighborhood,
  'id' | 'name' | 'city' | 'state'
>

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
      .select('id,name,city,state')
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
}
