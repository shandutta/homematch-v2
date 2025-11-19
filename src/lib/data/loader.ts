import { PropertyService } from '@/lib/services/properties'
import { Property, Neighborhood } from '@/types/database'
import { PropertyFilters } from '@/lib/schemas/property'

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
}

export async function loadDashboardData(
  options: {
    limit?: number
    offset?: number
    withScoring?: boolean
    userPreferences?: DashboardPreferences | null
  } = {}
): Promise<DashboardData> {
  const {
    limit = 20,
    offset = 0,
    withScoring = true,
    userPreferences,
  } = options
  const propertyService = new PropertyService()

  const filters: PropertyFilters = {}

  if (userPreferences) {
    const prefs = userPreferences

    if (prefs.priceRange) {
      filters.price_min = prefs.priceRange[0]
      filters.price_max = prefs.priceRange[1]
    }

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
      const selectedTypes = Object.entries(prefs.propertyTypes)
        .filter(([_, selected]) => selected)
        .map(([type]) => typeMapping[type] || type)
        .filter(Boolean)

      if (selectedTypes.length > 0) {
        // @ts-expect-error - Type mapping might produce strings not in the strict enum, but valid for DB query
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
  }

  try {
    const [{ properties, total }, neighborhoods] = await Promise.all([
      propertyService.searchProperties({
        filters,
        pagination: { limit, page: offset / limit + 1 },
      }),
      propertyService.getNeighborhoodsByCity('San Francisco', 'CA'),
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
