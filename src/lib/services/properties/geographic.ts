/**
 * GeographicService
 *
 * Specialized service for geographic and spatial operations.
 * Handles PostGIS spatial queries, distance calculations, and boundary operations.
 */

import type { Property } from '@/types/database'
import type { ISupabaseClientFactory } from '@/lib/services/interfaces'
import { BaseService } from '@/lib/services/base'
import {
  createTypedRPC,
  type PropertyWithDistance,
  type GeographicDensityResult,
  type AmenityResult,
  isRPCImplemented,
} from '@/lib/services/supabase-rpc-types'
import {
  callArrayRPC,
  callNumericRPC,
  callSingleRPC,
} from '@/lib/services/utils/rpc-wrapper'
import {
  type LatLng,
  type BoundingBox,
  parsePostGISGeometry,
  calculateDistance as calculateHaversineDistance,
  isValidLatLng,
  createCircularPolygon,
} from '@/lib/utils/coordinates'

// Legacy interface for backward compatibility
interface LegacyBoundingBox {
  northEast: { lat: number; lng: number }
  southWest: { lat: number; lng: number }
}

interface DistanceResult {
  property: Property
  distance_km: number
}

interface GeographicStats {
  total_properties: number
  avg_price: number
  price_density: Array<{
    lat: number
    lng: number
    price: number
    density_score: number
  }>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isBoundingBox = (
  value: BoundingBox | LegacyBoundingBox
): value is BoundingBox =>
  'north' in value && 'south' in value && 'east' in value && 'west' in value

const isGeographicDensityResult = (
  value: unknown
): value is GeographicDensityResult =>
  isRecord(value) &&
  isFiniteNumber(value.total_properties) &&
  isFiniteNumber(value.avg_price) &&
  Array.isArray(value.price_density)

const getDistanceValue = (value: unknown): number | null => {
  if (isFiniteNumber(value)) {
    return value
  }

  if (isRecord(value)) {
    const candidate =
      value.distance ?? value.calculate_distance ?? value.calculateDistance
    if (isFiniteNumber(candidate)) {
      return candidate
    }
    if (typeof candidate === 'string') {
      const numericCandidate = Number(candidate)
      if (Number.isFinite(numericCandidate)) {
        return numericCandidate
      }
    }
  }

  return null
}

type CommuteDestination = {
  destination_index: number
  latitude: number
  longitude: number
  straight_line_distance_km: number
  estimated_times_minutes: {
    driving: number
    transit: number
    walking: number
  }
  warning: string
}

type CommuteAnalysisResult = {
  property_id: string
  property_coordinates: LatLng
  destinations: CommuteDestination[]
  note: string
}

export interface IGeographicService {
  getPropertiesWithinRadius(
    lat: number,
    lng: number,
    radiusKm: number,
    limit?: number
  ): Promise<Property[]>
  getPropertiesInBounds(
    bounds: BoundingBox | LegacyBoundingBox,
    limit?: number
  ): Promise<Property[]>
  getPropertiesNearAddress(
    address: string,
    radiusKm: number
  ): Promise<Property[]>
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): Promise<number>
  getPropertiesAlongRoute(
    waypoints: LatLng[],
    corridorWidth: number
  ): Promise<Property[]>
  getGeographicDensity(
    bounds: BoundingBox | LegacyBoundingBox,
    gridSize: number
  ): Promise<GeographicStats>
  getCommuteAnalysis(
    propertyId: string,
    destinations: LatLng[]
  ): Promise<Record<string, unknown> | null>
  getWalkabilityScore(lat: number, lng: number): Promise<number>
  getTransitScore(lat: number, lng: number): Promise<number>
  getPropertiesWithTransitScores(
    bounds: BoundingBox | LegacyBoundingBox,
    minTransitScore?: number
  ): Promise<Property[]>
  getNearestAmenities(
    lat: number,
    lng: number,
    amenityTypes: string[],
    radius?: number
  ): Promise<AmenityResult[]>
  getPropertiesByDistance(
    lat: number,
    lng: number,
    maxDistance?: number,
    limit?: number
  ): Promise<DistanceResult[]>
  getPropertyClusters(
    bounds: BoundingBox | LegacyBoundingBox,
    zoomLevel: number
  ): Promise<
    Array<{ lat: number; lng: number; count: number; avg_price: number }>
  >
  getIsochroneAnalysis(
    lat: number,
    lng: number,
    travelTimes: number[],
    transportMode: 'walking' | 'driving' | 'transit'
  ): Promise<Record<string, unknown> | null>
  getPropertiesInPolygon(polygon: LatLng[], limit?: number): Promise<Property[]>
}

/**
 * Transforms PropertyWithDistance (from RPC) to a complete Property object
 * Ensures type safety by explicitly mapping all required Property fields
 */
function transformPropertyWithDistanceToProperty(
  item: PropertyWithDistance
): Property {
  return item.property
}

/**
 * Convert legacy bounding box format to standard format
 */
function normalizeBoundingBox(
  bounds: BoundingBox | LegacyBoundingBox
): BoundingBox {
  if (isBoundingBox(bounds)) {
    return bounds
  }

  if ('northEast' in bounds && 'southWest' in bounds) {
    // Legacy format
    return {
      north: bounds.northEast.lat,
      south: bounds.southWest.lat,
      east: bounds.northEast.lng,
      west: bounds.southWest.lng,
    }
  }
  throw new Error('Invalid bounds format')
}

/**
 * Extract coordinates from PostGIS property geometry
 */
function extractPropertyCoordinates(property: Property): LatLng | null {
  if (!property.coordinates) {
    return null
  }

  return parsePostGISGeometry(property.coordinates)
}

export class GeographicService
  extends BaseService
  implements IGeographicService
{
  constructor(clientFactory?: ISupabaseClientFactory) {
    super(clientFactory)
  }

  /**
   * Get properties within a specified radius of a point
   */
  async getPropertiesWithinRadius(
    lat: number,
    lng: number,
    radiusKm: number,
    limit = 50
  ): Promise<Property[]> {
    this.validateRequired({ lat, lng, radiusKm })

    return this.executeArrayQuery(
      'getPropertiesWithinRadius',
      async (supabase) => {
        const properties = await callArrayRPC(
          supabase,
          'get_properties_within_radius',
          {
            center_lat: lat,
            center_lng: lng,
            radius_km: radiusKm,
            result_limit: limit,
          },
          {
            operation: 'getPropertiesWithinRadius',
            errorContext: { lat, lng, radiusKm, limit },
            cache: {
              enabled: true,
              ttl: 2 * 60 * 1000, // 2 minutes for location-based queries
            },
          }
        )
        return properties
      }
    )
  }

  /**
   * Get properties within a bounding box
   */
  async getPropertiesInBounds(
    bounds: BoundingBox | LegacyBoundingBox,
    limit = 100
  ): Promise<Property[]> {
    this.validateRequired({ bounds })

    const normalizedBounds = normalizeBoundingBox(bounds)

    return this.executeArrayQuery('getPropertiesInBounds', async (supabase) => {
      const properties = await callArrayRPC(
        supabase,
        'get_properties_in_bounds',
        {
          north_lat: normalizedBounds.north,
          south_lat: normalizedBounds.south,
          east_lng: normalizedBounds.east,
          west_lng: normalizedBounds.west,
          result_limit: limit,
        },
        {
          operation: 'getPropertiesInBounds',
          errorContext: { bounds: normalizedBounds, limit },
          cache: {
            enabled: true,
            ttl: 5 * 60 * 1000, // 5 minutes for bounds queries
          },
        }
      )
      return properties
    })
  }

  /**
   * Get properties near an address
   */
  async getPropertiesNearAddress(
    address: string,
    radiusKm: number
  ): Promise<Property[]> {
    this.validateRequired({ address, radiusKm })

    return this.executeArrayQuery(
      'getPropertiesNearAddress',
      async (supabase) => {
        const rpc = createTypedRPC(supabase)

        // First try to geocode the address
        const { data: geocodeData, error: geocodeError } =
          await rpc.geocode_address({
            address_text: address,
          })

        if (geocodeError || !geocodeData || geocodeData.length === 0) {
          // Geocoding failed or returned no results, return empty array
          return []
        }

        const coordinate = geocodeData[0]
        if (!coordinate.latitude || !coordinate.longitude) {
          return []
        }

        // Now get properties within radius of the geocoded location
        const { data, error } = await rpc.get_properties_within_radius({
          center_lat: coordinate.latitude,
          center_lng: coordinate.longitude,
          radius_km: radiusKm,
          result_limit: 50,
        })

        if (error) {
          this.handleSupabaseError(error, 'getPropertiesNearAddress', {
            address,
            radiusKm,
          })
        }

        return data ?? []
      }
    )
  }

  /**
   * Calculate distance between two points
   */
  async calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): Promise<number> {
    this.validateRequired({ lat1, lng1, lat2, lng2 })

    const fallbackDistance = calculateHaversineDistance(
      { lat: lat1, lng: lng1 },
      { lat: lat2, lng: lng2 }
    )

    const result = await this.executeQuery(
      'calculateDistance',
      async (supabase) => {
        try {
          const distance = await callNumericRPC(
            supabase,
            'calculate_distance',
            {
              lat1,
              lng1,
              lat2,
              lng2,
            },
            {
              operation: 'calculateDistance',
              errorContext: { lat1, lng1, lat2, lng2 },
              fallbackValue: 0,
              cache: {
                enabled: true,
                ttl: 10 * 60 * 1000, // 10 minutes for distance calculations
                validate: isFiniteNumber,
              },
            }
          )

          const numericDistance = getDistanceValue(distance)
          if (numericDistance !== null) {
            return numericDistance
          }

          return fallbackDistance
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : isRecord(error) && typeof error.message === 'string'
                ? error.message
                : ''
          const networkIssue =
            /fetch failed|Failed to fetch|AbortSignal|ECONNREFUSED|ENOTFOUND|network/i
          const unknownFailure =
            message.trim() === '' ||
            /failed:\s*$|Unknown database error/i.test(message)

          if (networkIssue.test(message) || unknownFailure) {
            return fallbackDistance
          }

          throw error
        }
      }
    )

    return result ?? fallbackDistance
  }

  /**
   * Get properties along a route
   */
  async getPropertiesAlongRoute(
    waypoints: LatLng[],
    corridorWidth: number
  ): Promise<Property[]> {
    this.validateRequired({ waypoints, corridorWidth })

    // Validate all waypoints
    waypoints.forEach((waypoint, index) => {
      if (!isValidLatLng(waypoint)) {
        throw new Error(
          `Invalid waypoint at index ${index}: ${JSON.stringify(waypoint)}`
        )
      }
    })

    return this.executeArrayQuery(
      'getPropertiesAlongRoute',
      async (supabase) => {
        const rpc = createTypedRPC(supabase)
        const { data, error } = await rpc.get_properties_along_route({
          waypoints,
          corridor_width_km: corridorWidth,
        })

        if (error) {
          this.handleSupabaseError(error, 'getPropertiesAlongRoute', {
            waypoints,
            corridorWidth,
          })
        }

        return data || []
      }
    )
  }

  /**
   * Get geographic density analysis
   */
  async getGeographicDensity(
    bounds: BoundingBox | LegacyBoundingBox,
    gridSize: number
  ): Promise<GeographicStats> {
    this.validateRequired({ bounds, gridSize })

    const normalizedBounds = normalizeBoundingBox(bounds)
    const fallbackStats: GeographicStats = {
      total_properties: 0,
      avg_price: 0,
      price_density: [],
    }

    const result = await this.executeQuery(
      'getGeographicDensity',
      async (supabase) => {
        const densityResult: GeographicDensityResult | null =
          await callSingleRPC(
            supabase,
            'get_geographic_density',
            {
              north_lat: normalizedBounds.north,
              south_lat: normalizedBounds.south,
              east_lng: normalizedBounds.east,
              west_lng: normalizedBounds.west,
              grid_size_deg: gridSize,
            },
            {
              operation: 'getGeographicDensity',
              errorContext: { bounds: normalizedBounds, gridSize },
              cache: {
                enabled: true,
                ttl: 10 * 60 * 1000, // 10 minutes for density analysis
                validate: isGeographicDensityResult,
              },
            }
          )

        // Transform result with fallback
        if (!densityResult) {
          return fallbackStats
        }

        return {
          total_properties: densityResult.total_properties,
          avg_price: densityResult.avg_price,
          price_density: densityResult.price_density,
        }
      }
    )

    return result ?? fallbackStats
  }

  /**
   * Get commute analysis for a property
   */
  async getCommuteAnalysis(
    propertyId: string,
    destinations: LatLng[]
  ): Promise<Record<string, unknown> | null> {
    this.validateRequired({ propertyId, destinations })

    // Validate all destinations
    destinations.forEach((destination, index) => {
      if (!isValidLatLng(destination)) {
        throw new Error(
          `Invalid destination at index ${index}: ${JSON.stringify(destination)}`
        )
      }
    })

    return this.executeQuery('getCommuteAnalysis', async (supabase) => {
      try {
        // Get the property coordinates first
        const { data: property, error } = await supabase
          .from('properties')
          .select('coordinates')
          .eq('id', propertyId)
          .single()

        if (error) {
          console.error('Failed to fetch property for commute analysis:', error)
          return null
        }

        if (!property?.coordinates) {
          console.warn(
            'Property coordinates not available for commute analysis'
          )
          return null
        }

        // Extract coordinates using our utility function
        const propertyCoords = parsePostGISGeometry(property.coordinates)

        if (!propertyCoords) {
          throw new Error(
            'Unable to parse property coordinates from PostGIS geometry'
          )
        }

        // Calculate distances using our coordinate utilities
        const commuteAnalysis: CommuteAnalysisResult = {
          property_id: propertyId,
          property_coordinates: propertyCoords,
          destinations: [],
          note: 'Analysis uses straight-line distances - integrate with routing service for accurate travel times',
        }

        for (let i = 0; i < destinations.length; i++) {
          const destination = destinations[i]

          // Calculate straight-line distance using our utility
          const distanceKm = calculateHaversineDistance(
            propertyCoords,
            destination
          )

          // Simple time estimation: assume average speeds
          // Note: This is a rough approximation - real implementation needs routing API
          const estimatedDrivingTime = Math.round((distanceKm / 50) * 60) // 50 km/h avg

          commuteAnalysis.destinations.push({
            destination_index: i,
            latitude: destination.lat,
            longitude: destination.lng,
            straight_line_distance_km: Math.round(distanceKm * 100) / 100, // Round to 2 decimals
            estimated_times_minutes: {
              driving: estimatedDrivingTime,
              transit: Math.round(estimatedDrivingTime * 1.5),
              walking: Math.round(estimatedDrivingTime * 4),
            },
            warning:
              'Estimates are based on straight-line distance - not actual routes',
          })
        }

        return commuteAnalysis
      } catch (error) {
        console.error('Commute analysis failed:', error)
        throw new Error(
          `Commute analysis not available: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    })
  }

  /**
   * Get walkability score for a location
   */
  async getWalkabilityScore(lat: number, lng: number): Promise<number> {
    this.validateRequired({ lat, lng })

    const fallbackScore = 50
    const result = await this.executeQuery(
      'getWalkabilityScore',
      async (supabase) => {
        return callNumericRPC(
          supabase,
          'get_walkability_score',
          {
            center_lat: lat,
            center_lng: lng,
          },
          {
            operation: 'getWalkabilityScore',
            errorContext: { lat, lng },
            fallbackValue: fallbackScore,
            cache: {
              enabled: true,
              ttl: 15 * 60 * 1000, // 15 minutes for walkability scores
              validate: isFiniteNumber,
            },
          }
        )
      }
    )

    return result ?? fallbackScore
  }

  /**
   * Get transit score for a location
   */
  async getTransitScore(lat: number, lng: number): Promise<number> {
    this.validateRequired({ lat, lng })

    const fallbackScore = 30
    const result = await this.executeQuery(
      'getTransitScore',
      async (supabase) => {
        const rpc = createTypedRPC(supabase)
        const { data, error } = await rpc.get_transit_score({
          center_lat: lat,
          center_lng: lng,
        })

        if (error || data === null || data === undefined) {
          console.warn(
            'Transit score calculation failed, using fallback value:',
            error?.message
          )
          return fallbackScore
        }

        return data
      }
    )

    return result ?? fallbackScore
  }

  /**
   * Get properties with transit scores
   */
  async getPropertiesWithTransitScores(
    bounds: BoundingBox | LegacyBoundingBox,
    minTransitScore = 50
  ): Promise<Property[]> {
    this.validateRequired({ bounds, minTransitScore })

    return this.executeArrayQuery(
      'getPropertiesWithTransitScores',
      async (supabase) => {
        // Get all properties in bounds first
        const properties = await this.getPropertiesInBounds(bounds, 200)

        // Filter properties by calculating transit score for each
        const propertiesWithTransitScores: Property[] = []

        for (const property of properties) {
          if (property.coordinates) {
            try {
              // Extract coordinates using our utility function
              const coords = extractPropertyCoordinates(property)

              if (!coords) {
                console.warn(
                  `Unable to extract coordinates for property ${property.id}`
                )
                continue
              }

              const rpc = createTypedRPC(supabase)
              const { data: transitScore, error: scoreError } =
                await rpc.get_transit_score({
                  center_lat: coords.lat,
                  center_lng: coords.lng,
                })

              if (scoreError) {
                console.warn(
                  `Transit score calculation failed for property ${property.id}:`,
                  scoreError.message
                )
                continue
              }

              if (transitScore && transitScore >= minTransitScore) {
                propertiesWithTransitScores.push(property)
              }
            } catch (error) {
              console.warn(
                `Error processing transit score for property ${property.id}:`,
                error
              )
              continue
            }
          }
        }

        return propertiesWithTransitScores
      }
    )
  }

  /**
   * Get nearest amenities to a location
   */
  async getNearestAmenities(
    lat: number,
    lng: number,
    amenityTypes: string[],
    radius = 2
  ): Promise<AmenityResult[]> {
    this.validateRequired({ lat, lng, amenityTypes })

    return this.executeArrayQuery('getNearestAmenities', async (supabase) => {
      // Check if the RPC function is properly implemented
      if (!isRPCImplemented('get_nearest_amenities')) {
        throw new Error(
          'Amenities search feature not implemented - requires integration with external POI/amenities database'
        )
      }

      const rpc = createTypedRPC(supabase)
      const { data, error } = await rpc.get_nearest_amenities({
        center_lat: lat,
        center_lng: lng,
        amenity_types: amenityTypes,
        search_radius_km: radius,
      })

      if (error) {
        // Check if it's a function not found error (stub implementation)
        if (
          error.code === '42883' ||
          error.message?.includes('does not exist')
        ) {
          throw new Error(
            'Amenities search feature requires database function implementation and external data source integration'
          )
        }
        console.error('Failed to fetch nearest amenities:', error)
        throw new Error(`Amenities search failed: ${error.message}`)
      }

      if (!data || data.length === 0) {
        console.warn(
          `No amenities found for types [${amenityTypes.join(', ')}] within ${radius}km of location [${lat}, ${lng}]`
        )
        return []
      }

      return data
    })
  }

  /**
   * Transforms PropertyWithDistance array to DistanceResult array
   * @private
   */
  private transformToDistanceResults(
    data: PropertyWithDistance[]
  ): DistanceResult[] {
    return data.map((item) => ({
      property: transformPropertyWithDistanceToProperty(item),
      distance_km: item.distance_km,
    }))
  }

  /**
   * Executes RPC query for properties by distance
   * @private
   */
  private async queryPropertiesByDistance(
    supabase: Parameters<Parameters<typeof this.executeArrayQuery>[1]>[0],
    lat: number,
    lng: number,
    maxDistance: number,
    limit: number
  ): Promise<PropertyWithDistance[]> {
    const rpc = createTypedRPC(supabase)
    const { data, error } = await rpc.get_properties_by_distance({
      center_lat: lat,
      center_lng: lng,
      max_distance_km: maxDistance,
      result_limit: limit,
    })

    if (error) {
      this.handleSupabaseError(error, 'getPropertiesByDistance', {
        lat,
        lng,
        maxDistance,
        limit,
      })
    }

    return data || []
  }

  /**
   * Get properties sorted by distance from a point
   */
  async getPropertiesByDistance(
    lat: number,
    lng: number,
    maxDistance = 10,
    limit = 20
  ): Promise<DistanceResult[]> {
    this.validateRequired({ lat, lng })

    return this.executeArrayQuery(
      'getPropertiesByDistance',
      async (supabase) => {
        const rpcData = await this.queryPropertiesByDistance(
          supabase,
          lat,
          lng,
          maxDistance,
          limit
        )

        return this.transformToDistanceResults(rpcData)
      }
    )
  }

  /**
   * Get property clusters for mapping
   */
  async getPropertyClusters(
    bounds: BoundingBox | LegacyBoundingBox,
    zoomLevel: number
  ): Promise<
    Array<{ lat: number; lng: number; count: number; avg_price: number }>
  > {
    this.validateRequired({ bounds, zoomLevel })

    const normalizedBounds = normalizeBoundingBox(bounds)

    return this.executeArrayQuery('getPropertyClusters', async (supabase) => {
      const rpc = createTypedRPC(supabase)
      const { data, error } = await rpc.get_property_clusters({
        north_lat: normalizedBounds.north,
        south_lat: normalizedBounds.south,
        east_lng: normalizedBounds.east,
        west_lng: normalizedBounds.west,
        zoom_level: zoomLevel,
      })

      if (error) {
        this.handleSupabaseError(error, 'getPropertyClusters', {
          bounds: normalizedBounds,
          zoomLevel,
        })
      }

      return data || []
    })
  }

  /**
   * Gets transport speed based on mode
   * @private
   */
  private getTransportSpeed(mode: 'walking' | 'driving' | 'transit'): number {
    const speeds = {
      walking: 5, // km/h
      driving: 50, // km/h
      transit: 25, // km/h
    }
    return speeds[mode]
  }

  /**
   * Generates circular polygon points for isochrone using coordinate utilities
   * @private
   */
  private generateCircularPolygon(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    numPoints = 16
  ): LatLng[] {
    const center: LatLng = { lat: centerLat, lng: centerLng }
    return createCircularPolygon(center, radiusKm, numPoints)
  }

  /**
   * Creates isochrone data for a single travel time
   * @private
   */
  private createIsochroneForTime(
    lat: number,
    lng: number,
    timeMinutes: number,
    transportMode: 'walking' | 'driving' | 'transit'
  ): Record<string, unknown> {
    const speed = this.getTransportSpeed(transportMode)
    const radiusKm = (timeMinutes / 60) * speed
    const polygon = this.generateCircularPolygon(lat, lng, radiusKm)

    return {
      travel_time_minutes: timeMinutes,
      transport_mode: transportMode,
      radius_km: radiusKm,
      polygon,
      center: { lat, lng },
    }
  }

  /**
   * Generates multiple isochrones for different travel times
   * @private
   */
  private generateIsochrones(
    lat: number,
    lng: number,
    travelTimes: number[],
    transportMode: 'walking' | 'driving' | 'transit'
  ): Array<Record<string, unknown>> {
    return travelTimes.map((timeMinutes) =>
      this.createIsochroneForTime(lat, lng, timeMinutes, transportMode)
    )
  }

  /**
   * Get isochrone analysis (travel time areas)
   */
  async getIsochroneAnalysis(
    lat: number,
    lng: number,
    travelTimes: number[],
    transportMode: 'walking' | 'driving' | 'transit'
  ): Promise<Record<string, unknown> | null> {
    this.validateRequired({ lat, lng, travelTimes, transportMode })

    return this.executeQuery('getIsochroneAnalysis', async (_supabase) => {
      // Simplified isochrone analysis using circular approximations
      // In a real implementation, this would use routing APIs to generate realistic isochrones
      const isochrones = this.generateIsochrones(
        lat,
        lng,
        travelTimes,
        transportMode
      )

      return {
        center_location: { lat, lng },
        transport_mode: transportMode,
        isochrones,
        generated_at: new Date().toISOString(),
        method: 'circular_approximation',
      }
    })
  }

  /**
   * Get properties within a custom polygon
   */
  async getPropertiesInPolygon(
    polygon: LatLng[],
    limit = 100
  ): Promise<Property[]> {
    this.validateRequired({ polygon })

    // Validate all polygon points
    polygon.forEach((point, index) => {
      if (!isValidLatLng(point)) {
        throw new Error(
          `Invalid polygon point at index ${index}: ${JSON.stringify(point)}`
        )
      }
    })

    if (polygon.length < 3) {
      throw new Error('Polygon must have at least 3 points')
    }

    return this.executeArrayQuery(
      'getPropertiesInPolygon',
      async (supabase) => {
        const rpc = createTypedRPC(supabase)
        const { data, error } = await rpc.get_properties_in_polygon({
          polygon_points: polygon,
          result_limit: limit,
        })

        if (error) {
          this.handleSupabaseError(error, 'getPropertiesInPolygon', {
            polygon,
            limit,
          })
        }

        return data || []
      }
    )
  }
}
