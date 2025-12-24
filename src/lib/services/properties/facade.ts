/**
 * PropertyService Facade
 *
 * Maintains 100% backward compatibility with the existing PropertyService
 * while delegating to specialized services internally. This allows gradual
 * migration without breaking existing consumers.
 */

import type {
  Property,
  PropertyInsert,
  PropertyUpdate,
  PropertyWithNeighborhood,
  Neighborhood,
  NeighborhoodInsert,
  NeighborhoodUpdate,
} from '@/types/database'
import type { PropertySearch } from '@/lib/schemas/property'
import type {
  IPropertyService,
  IPropertyCrudService,
  IPropertySearchService,
  INeighborhoodService,
  PropertyStats,
  PropertySearchResult,
  IPropertyStatsService,
} from '../interfaces/index'
import { BaseService } from '../base'
import type { ISupabaseClientFactory } from '../interfaces'
import { PropertyCrudService } from './crud'
import { PropertySearchService } from './search'
import { NeighborhoodService } from './neighborhood'
import { GeographicService, type IGeographicService } from './geographic'

/**
 * Main PropertyService facade that maintains backward compatibility
 * while using specialized services internally
 */
export class PropertyServiceFacade
  extends BaseService
  implements IPropertyService
{
  // Specialized service instances
  readonly crudService: IPropertyCrudService
  readonly searchService: IPropertySearchService
  readonly neighborhoodService: INeighborhoodService
  readonly statsService: IPropertyStatsService
  readonly geographicService: IGeographicService

  constructor(clientFactory?: ISupabaseClientFactory) {
    super(clientFactory)

    // Initialize specialized services
    this.crudService = new PropertyCrudService(clientFactory)
    this.searchService = new PropertySearchService(clientFactory)
    this.neighborhoodService = new NeighborhoodService(clientFactory)
    this.statsService = this.searchService
    this.geographicService = new GeographicService(clientFactory)
  }

  // ============================================================================
  // PROPERTY CRUD OPERATIONS (delegate to PropertyCrudService)
  // ============================================================================

  async getProperty(propertyId: string): Promise<Property | null> {
    return this.crudService.getProperty(propertyId)
  }

  async getPropertyWithNeighborhood(
    propertyId: string
  ): Promise<PropertyWithNeighborhood | null> {
    return this.crudService.getPropertyWithNeighborhood(propertyId)
  }

  async createProperty(property: PropertyInsert): Promise<Property | null> {
    return this.crudService.createProperty(property)
  }

  async updateProperty(
    propertyId: string,
    updates: PropertyUpdate
  ): Promise<Property | null> {
    return this.crudService.updateProperty(propertyId, updates)
  }

  async deleteProperty(propertyId: string): Promise<boolean> {
    try {
      const result = await this.crudService.deleteProperty(propertyId)
      // Handle null return from error handler (backward compatibility)
      return result ?? false
    } catch (_error) {
      // For backward compatibility, return false on error
      return false
    }
  }

  async getPropertiesByZpid(zpid: string): Promise<Property | null> {
    return this.crudService.getPropertiesByZpid(zpid)
  }

  async getPropertiesByHash(hash: string): Promise<Property | null> {
    return this.crudService.getPropertiesByHash(hash)
  }

  // ============================================================================
  // PROPERTY SEARCH OPERATIONS (delegate to PropertySearchService)
  // ============================================================================

  async searchProperties(
    searchParams: PropertySearch,
    options?: {
      select?: string
      includeCount?: boolean
      includeNeighborhoods?: boolean
    }
  ): Promise<PropertySearchResult> {
    try {
      return await this.searchService.searchProperties(searchParams, options)
    } catch (_error) {
      // Return structured error response for search operations
      const { pagination = {} } = searchParams
      const { page = 1, limit = 20 } = pagination as {
        page?: number
        limit?: number
      }

      return {
        properties: [],
        total: 0,
        page,
        limit,
      }
    }
  }

  async getPropertiesByNeighborhood(
    neighborhoodId: string,
    limit = 20
  ): Promise<Property[]> {
    return this.searchService.getPropertiesByNeighborhood(neighborhoodId, limit)
  }

  async getPropertiesWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<Property[]> {
    return this.geographicService.getPropertiesWithinRadius(
      latitude,
      longitude,
      radiusKm
    )
  }

  async getPropertiesInNeighborhood(
    neighborhoodName: string,
    _city: string,
    _state: string
  ): Promise<Property[]> {
    return this.searchService.getPropertiesByNeighborhood(neighborhoodName)
  }

  async getPropertyStats(): Promise<PropertyStats> {
    return this.searchService.getPropertyStats()
  }

  // ============================================================================
  // NEIGHBORHOOD OPERATIONS (delegate to NeighborhoodService)
  // ============================================================================

  async getNeighborhood(neighborhoodId: string): Promise<Neighborhood | null> {
    return this.neighborhoodService.getNeighborhood(neighborhoodId)
  }

  async createNeighborhood(
    neighborhood: NeighborhoodInsert
  ): Promise<Neighborhood | null> {
    return this.neighborhoodService.createNeighborhood(neighborhood)
  }

  async updateNeighborhood(
    neighborhoodId: string,
    updates: NeighborhoodUpdate
  ): Promise<Neighborhood | null> {
    return this.neighborhoodService.updateNeighborhood(neighborhoodId, updates)
  }

  async getNeighborhoodsByCity(
    city: string,
    state: string
  ): Promise<Neighborhood[]> {
    return this.neighborhoodService.getNeighborhoodsByCity(city, state)
  }

  async getNeighborhoodsByMetroArea(
    metroArea: string
  ): Promise<Neighborhood[]> {
    return this.neighborhoodService.getNeighborhoodsByMetroArea(metroArea)
  }

  async searchNeighborhoods(query: string): Promise<Neighborhood[]> {
    return this.neighborhoodService.searchNeighborhoods(query)
  }

  // ============================================================================
  // GEOGRAPHIC OPERATIONS (delegate to GeographicService)
  // ============================================================================

  async getPropertiesInBounds(
    bounds: {
      northEast: { lat: number; lng: number }
      southWest: { lat: number; lng: number }
    },
    limit = 100
  ): Promise<Property[]> {
    return this.geographicService.getPropertiesInBounds(bounds, limit)
  }

  async calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): Promise<number> {
    return this.geographicService.calculateDistance(lat1, lng1, lat2, lng2)
  }

  async getWalkabilityScore(lat: number, lng: number): Promise<number> {
    return this.geographicService.getWalkabilityScore(lat, lng)
  }

  async getPropertiesNearAddress(
    address: string,
    radiusKm: number
  ): Promise<Property[]> {
    return this.geographicService.getPropertiesNearAddress(address, radiusKm)
  }

  async getPropertiesAlongRoute(
    waypoints: Array<{ lat: number; lng: number }>,
    corridorWidth: number
  ): Promise<Property[]> {
    return this.geographicService.getPropertiesAlongRoute(
      waypoints,
      corridorWidth
    )
  }

  async getGeographicDensity(
    bounds: {
      northEast: { lat: number; lng: number }
      southWest: { lat: number; lng: number }
    },
    gridSize: number
  ): Promise<{
    total_properties: number
    avg_price: number
    price_density: Array<{
      lat: number
      lng: number
      price: number
      density_score: number
    }>
  }> {
    return this.geographicService.getGeographicDensity(bounds, gridSize)
  }

  async getCommuteAnalysis(
    propertyId: string,
    destinations: Array<{ lat: number; lng: number }>
  ): Promise<Record<string, unknown> | null> {
    return this.geographicService.getCommuteAnalysis(propertyId, destinations)
  }

  async getTransitScore(lat: number, lng: number): Promise<number> {
    return this.geographicService.getTransitScore(lat, lng)
  }
}

// ============================================================================
// FEATURE FLAG INTEGRATION
// ============================================================================

/**
 * Feature flag aware PropertyService factory
 * Allows gradual rollout of new facade implementation
 */
export function createPropertyService(
  clientFactory?: ISupabaseClientFactory
): PropertyServiceFacade {
  const useNewService = process.env.FEATURE_NEW_PROPERTY_SERVICE !== 'false' // Default to new service

  if (!useNewService) {
    // Could return the original PropertyService here for rollback
    // For now, we'll always use the facade since it maintains compatibility
  }

  return new PropertyServiceFacade(clientFactory)
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORT
// ============================================================================

/**
 * Export facade as PropertyService to maintain import compatibility
 * This allows existing imports to work without modification:
 * import { PropertyService } from '@/lib/services/properties'
 */
export { PropertyServiceFacade as PropertyService }
