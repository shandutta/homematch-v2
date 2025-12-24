import { PropertyService } from '@/lib/services/properties'
import { unstable_cache } from 'next/cache'
import { createClient as createStandaloneClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ISupabaseClientFactory } from '@/lib/services/interfaces'
import type { Property, Neighborhood, Database } from '@/types/database'
import {
  PROPERTY_TYPE_VALUES,
  type PropertyFilters,
  type PropertyType,
  type PropertySearch,
} from '@/lib/schemas/property'
import {
  ALL_CITIES_SENTINEL_THRESHOLD,
  DEFAULT_PRICE_RANGE,
} from '@/lib/constants/preferences'

const DASHBOARD_PROPERTY_CACHE_TTL_SECONDS = 60

class StaticSupabaseClientFactory implements ISupabaseClientFactory {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async createClient(): Promise<SupabaseClient<Database>> {
    return this.client
  }

  getInstance(): ISupabaseClientFactory {
    return this
  }
}

const createAnonPropertyService = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  const client = createStandaloneClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return new PropertyService(new StaticSupabaseClientFactory(client))
}

const anonPropertyService = createAnonPropertyService()

const cachedSearchProperties = anonPropertyService
  ? unstable_cache(
      async (
        _cacheKey: string,
        searchParams: PropertySearch,
        options: {
          select?: string
          includeCount?: boolean
          includeNeighborhoods?: boolean
        }
      ) => {
        return anonPropertyService.searchProperties(searchParams, options)
      },
      ['dashboard-properties'],
      { revalidate: DASHBOARD_PROPERTY_CACHE_TTL_SECONDS }
    )
  : null

export interface DashboardData {
  properties: Property[]
  neighborhoods: Neighborhood[]
  totalProperties: number
  scored: boolean
  userStats: {
    totalViewed: number
    totalLiked: number
    totalMatches: number
  }
}

export interface DashboardPreferences {
  priceRange?: [number, number]
  bedrooms?: number
  bathrooms?: number
  propertyTypes?: Record<string, boolean>
  mustHaves?: Record<string, boolean>
  searchRadius?: number
  allCities?: boolean
  cities?: NonNullable<PropertyFilters['cities']>
  neighborhoods?: NonNullable<PropertyFilters['neighborhoods']>
}

export const DASHBOARD_PROPERTY_SELECT = `
  id,
  address,
  city,
  state,
  zip_code,
  price,
  bedrooms,
  bathrooms,
  square_feet,
  property_type,
  images,
  description,
  amenities,
  lot_size_sqft,
  neighborhood_id,
  zpid,
  year_built,
  coordinates
`

const shouldTreatAsAllCities = (
  prefs?: DashboardPreferences | null
): boolean => {
  if (!prefs) return false
  const cityCount = prefs.cities?.length ?? 0
  const neighborhoodCount = prefs.neighborhoods?.length ?? 0

  return (
    Boolean(prefs.allCities) ||
    cityCount >= ALL_CITIES_SENTINEL_THRESHOLD ||
    neighborhoodCount >= ALL_CITIES_SENTINEL_THRESHOLD
  )
}

export function buildPropertyFiltersFromPreferences(
  userPreferences?: DashboardPreferences | null
): PropertyFilters {
  const filters: PropertyFilters = {}

  const prefs = userPreferences || {}
  const treatAsAllCities = shouldTreatAsAllCities(prefs)

  if (
    prefs.neighborhoods &&
    prefs.neighborhoods.length > 0 &&
    !treatAsAllCities
  ) {
    filters.neighborhoods = prefs.neighborhoods
  } else if (prefs.cities && prefs.cities.length > 0 && !treatAsAllCities) {
    filters.cities = prefs.cities
  }

  const priceRange = prefs.priceRange || DEFAULT_PRICE_RANGE
  filters.price_min = priceRange[0]
  filters.price_max = priceRange[1]

  if (prefs.bedrooms) {
    filters.bedrooms_min = prefs.bedrooms
  }

  if (prefs.bathrooms) {
    filters.bathrooms_min = prefs.bathrooms
  }

  if (prefs.propertyTypes) {
    const typeMapping: Record<string, string> = {
      house: 'single_family',
      townhouse: 'townhome',
      condo: 'condo',
    }
    const propertyTypeSet = new Set<PropertyType>(PROPERTY_TYPE_VALUES)
    const selectedTypes = Object.entries(prefs.propertyTypes)
      .filter(([_, selected]) => selected)
      .map(([type]) => typeMapping[type] || type)
      .filter((type): type is PropertyType =>
        propertyTypeSet.has(type as PropertyType)
      )

    if (selectedTypes.length > 0) {
      filters.property_types = selectedTypes
    }
  }

  if (prefs.mustHaves) {
    const amenityMapping: Record<string, string> = {
      parking: 'Parking',
      pool: 'Pool',
      gym: 'Gym',
      petFriendly: 'Pet Friendly',
    }
    const selectedAmenities = Object.entries(prefs.mustHaves)
      .filter(([_, selected]) => selected)
      .map(([amenity]) => amenityMapping[amenity] || amenity)

    if (selectedAmenities.length > 0) {
      filters.amenities = selectedAmenities
    }
  }

  return filters
}

export async function loadDashboardData(
  options: {
    limit?: number
    offset?: number
    withScoring?: boolean
    userPreferences?: DashboardPreferences | null
    includeNeighborhoods?: boolean
    includeCount?: boolean
    propertySelect?: string
    useCache?: boolean
    cacheKey?: string
  } = {}
): Promise<DashboardData> {
  const {
    limit = 20,
    offset = 0,
    withScoring = true,
    userPreferences,
    includeNeighborhoods = true,
    includeCount = true,
    propertySelect,
    useCache = false,
    cacheKey,
  } = options
  const propertyService = new PropertyService()

  const filters = buildPropertyFiltersFromPreferences(userPreferences)

  try {
    const neighborhoodsPromise = async () => {
      if (!includeNeighborhoods) {
        return []
      }

      if (shouldTreatAsAllCities(userPreferences)) {
        return []
      }

      if (userPreferences?.cities && userPreferences.cities.length > 0) {
        const results = await Promise.all(
          userPreferences.cities.map(({ city, state }) =>
            propertyService.getNeighborhoodsByCity(city, state)
          )
        )
        const deduped = new Map<string, Neighborhood>()
        results.flat().forEach((neighborhood) => {
          deduped.set(neighborhood.id, neighborhood)
        })
        return Array.from(deduped.values())
      }

      return await propertyService.getNeighborhoodsByCity('San Francisco', 'CA')
    }

    const searchParams: PropertySearch = {
      filters,
      pagination: { limit, page: offset / limit + 1 },
    }
    const searchOptions = {
      select: propertySelect,
      includeCount,
      includeNeighborhoods,
    }
    const searchPromise =
      useCache && cachedSearchProperties
        ? cachedSearchProperties(
            [
              cacheKey || 'dashboard',
              JSON.stringify(filters),
              limit,
              offset,
              includeNeighborhoods ? '1' : '0',
              includeCount ? '1' : '0',
              propertySelect || '',
            ].join('|'),
            searchParams,
            searchOptions
          )
        : propertyService.searchProperties(searchParams, searchOptions)

    const [{ properties, total }, neighborhoods] = await Promise.all([
      searchPromise,
      neighborhoodsPromise(),
    ])

    // Fetch user stats (mock for now, can be implemented later)
    const userStats = {
      totalViewed: 0,
      totalLiked: 0,
      totalMatches: 0,
    }

    return {
      properties: properties || [],
      neighborhoods: neighborhoods || [],
      totalProperties: total || 0,
      scored: withScoring,
      userStats,
    }
  } catch (_error) {
    // Return empty data on error
    return {
      properties: [],
      neighborhoods: [],
      totalProperties: 0,
      scored: false,
      userStats: {
        totalViewed: 0,
        totalLiked: 0,
        totalMatches: 0,
      },
    }
  }
}

// Load properties sorted by match score (called from dashboard)
export async function loadScoredProperties(
  limit: number = 10
): Promise<Property[]> {
  try {
    const data = await loadDashboardData({ limit, withScoring: true })

    // Sort by calculated_match_score if available, otherwise by match_score
    return data.properties.sort((a, b) => {
      const scoreA =
        (a as Property & { calculated_match_score?: number })
          .calculated_match_score || 0
      const scoreB =
        (b as Property & { calculated_match_score?: number })
          .calculated_match_score || 0
      return scoreB - scoreA
    })
  } catch (_error) {
    return []
  }
}
