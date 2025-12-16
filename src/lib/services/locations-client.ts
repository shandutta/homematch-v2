'use client'

import { createClient } from '@/lib/supabase/client'
import type { Neighborhood } from '@/types/database'
import {
  buildCityStateOrClause,
  type CityStatePair,
} from '@/lib/utils/postgrest'

export type CityOption = CityStatePair

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
  ): Promise<Neighborhood[]> {
    if (!cities.length) return []

    const supabase = createClient()

    let query = supabase.from('neighborhoods').select('*').order('name')

    if (cities.length === 1) {
      const [single] = cities
      query = query.eq('city', single!.city).eq('state', single!.state)
    } else {
      const orClause = buildCityStateOrClause(cities)
      if (orClause) {
        query = query.or(orClause)
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to load neighborhoods: ${error.message}`)
    }

    return data || []
  }
}
