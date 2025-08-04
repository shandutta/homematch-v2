import { PropertyService } from '@/lib/services/properties'
import { Property, Neighborhood } from '@/types/database'

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

export async function loadDashboardData(
  options: {
    limit?: number
    offset?: number
    withScoring?: boolean
  } = {}
): Promise<DashboardData> {
  const { limit = 20, offset = 0, withScoring = true } = options
  const propertyService = new PropertyService()

  try {
    const [{ properties, total }, neighborhoods] = await Promise.all([
      propertyService.searchProperties({
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
