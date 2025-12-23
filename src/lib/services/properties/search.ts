/**
 * PropertySearchService
 *
 * Specialized service for property search operations, analytics, and filtering.
 * Handles complex search queries, geographic filtering, and performance metrics.
 */

import type { Property } from '@/types/database'
import type { PropertySearch } from '@/lib/schemas/property'
import type {
  IPropertySearchService,
  ISupabaseClientFactory,
  PropertySearchResult,
  PropertyStats,
} from '@/lib/services/interfaces'
import { BaseService } from '@/lib/services/base'
import { createTypedRPC } from '@/lib/services/supabase-rpc-types'
import { PropertyFilterBuilder } from '@/lib/services/filters/PropertyFilterBuilder'
import { buildCityStateKeys } from '@/lib/utils/postgrest'

export class PropertySearchService
  extends BaseService
  implements IPropertySearchService
{
  private filterBuilder: PropertyFilterBuilder

  constructor(clientFactory?: ISupabaseClientFactory) {
    super(clientFactory)
    this.filterBuilder = new PropertyFilterBuilder()
  }

  /**
   * Advanced property search with filtering and pagination
   */
  async searchProperties(
    searchParams: PropertySearch
  ): Promise<PropertySearchResult> {
    this.validateRequired({ searchParams })

    const { filters = {}, pagination = {} } = searchParams
    const {
      page = 1,
      limit = 20,
      sort,
    } = pagination as {
      page?: number
      limit?: number
      sort?: { field: string; direction: 'asc' | 'desc' }
    }

    try {
      const supabase = await this.getSupabase()

      // Build base query with neighborhood join
      let query = supabase
        .from('properties')
        .select(
          `
          *,
          neighborhood:neighborhoods(*)
        `,
          { count: 'exact' }
        )
        .eq('is_active', true)

      // Apply filters using the filter builder
      query = this.filterBuilder.applyFilters(query, filters)

      // Apply multi-city filter (OR across city+state pairs)
      if (filters.cities && filters.cities.length > 0) {
        const cityStateKeys = buildCityStateKeys(filters.cities)
        if (cityStateKeys.length === 1) {
          query = query.eq('city_state_key', cityStateKeys[0]!)
        } else if (cityStateKeys.length > 1) {
          query = query.in('city_state_key', cityStateKeys)
        }
      }

      // Apply sorting
      if (sort) {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        this.handleSupabaseError(error, 'searchProperties', { searchParams })
        // Return fallback response after logging error
        return {
          properties: [],
          total: 0,
          page,
          limit,
        }
      }

      return {
        properties: data || [],
        total: count || 0,
        page,
        limit,
      }
    } catch (_error) {
      // Return structured error response for search operations
      return {
        properties: [],
        total: 0,
        page,
        limit,
      }
    }
  }

  /**
   * Get properties within a specific neighborhood
   */
  async getPropertiesByNeighborhood(
    neighborhoodId: string,
    limit = 20
  ): Promise<Property[]> {
    this.validateRequired({ neighborhoodId })

    return this.executeArrayQuery(
      'getPropertiesByNeighborhood',
      async (supabase) => {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('neighborhood_id', neighborhoodId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          this.handleSupabaseError(error, 'getPropertiesByNeighborhood', {
            neighborhoodId,
            limit,
          })
        }

        return data || []
      }
    )
  }

  /**
   * Geographic search within radius using PostGIS
   */
  async getPropertiesWithinRadius(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<Property[]> {
    this.validateRequired({ latitude, longitude, radiusKm })

    return this.executeArrayQuery(
      'getPropertiesWithinRadius',
      async (supabase) => {
        const rpc = createTypedRPC(supabase)
        const { data, error } = await rpc.get_properties_within_radius({
          center_lat: latitude,
          center_lng: longitude,
          radius_km: radiusKm,
          result_limit: 50,
        })

        if (error) {
          this.handleSupabaseError(error, 'getPropertiesWithinRadius', {
            latitude,
            longitude,
            radiusKm,
          })
        }

        return data || []
      }
    )
  }

  /**
   * Get properties in a neighborhood by name and location
   */
  async getPropertiesInNeighborhood(
    neighborhoodName: string,
    city: string,
    state: string
  ): Promise<Property[]> {
    this.validateRequired({ neighborhoodName, city, state })

    return this.executeArrayQuery(
      'getPropertiesInNeighborhood',
      async (supabase) => {
        const { data, error } = await supabase
          .from('properties')
          .select(
            `
            *,
            neighborhood:neighborhoods!inner(name, city, state)
          `
          )
          .eq('neighborhood.name', neighborhoodName)
          .eq('neighborhood.city', city)
          .eq('neighborhood.state', state)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) {
          this.handleSupabaseError(error, 'getPropertiesInNeighborhood', {
            neighborhoodName,
            city,
            state,
          })
        }

        return data || []
      }
    )
  }

  /**
   * Get property statistics and analytics
   */
  async getPropertyStats(): Promise<PropertyStats> {
    return this.executeQuery('getPropertyStats', async (supabase) => {
      const { data, error } = await supabase
        .from('properties')
        .select('price, bedrooms, bathrooms, square_feet, property_type')
        .eq('is_active', true)

      if (error) {
        this.handleSupabaseError(error, 'getPropertyStats', {})
      }

      const properties = data || []
      const totalProperties = properties.length

      if (totalProperties === 0) {
        return {
          total_properties: 0,
          avg_price: 0,
          median_price: 0,
          avg_bedrooms: 0,
          avg_bathrooms: 0,
          avg_square_feet: 0,
          property_type_distribution: {},
        }
      }

      const prices = properties.map((p) => p.price).sort((a, b) => a - b)
      const avgPrice =
        prices.reduce((sum, price) => sum + price, 0) / totalProperties
      const medianPrice = prices[Math.floor(totalProperties / 2)]

      const avgBedrooms =
        properties.reduce((sum, p) => sum + p.bedrooms, 0) / totalProperties
      const avgBathrooms =
        properties.reduce((sum, p) => sum + p.bathrooms, 0) / totalProperties

      const propertiesWithSquareFeet = properties.filter(
        (p) => p.square_feet !== null
      )
      const avgSquareFeet =
        propertiesWithSquareFeet.length > 0
          ? propertiesWithSquareFeet.reduce(
              (sum, p) => sum + (p.square_feet || 0),
              0
            ) / propertiesWithSquareFeet.length
          : 0

      const typeDistribution = properties.reduce(
        (acc, p) => {
          const type = p.property_type || 'unknown'
          acc[type] = (acc[type] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      return {
        total_properties: totalProperties,
        avg_price: Math.round(avgPrice),
        median_price: medianPrice,
        avg_bedrooms: Math.round(avgBedrooms * 10) / 10,
        avg_bathrooms: Math.round(avgBathrooms * 10) / 10,
        avg_square_feet: Math.round(avgSquareFeet),
        property_type_distribution: typeDistribution,
      }
    })
  }

  /**
   * Advanced text search across property fields
   */
  async searchPropertiesText(query: string, limit = 20): Promise<Property[]> {
    this.validateRequired({ query })

    // Sanitize query to prevent PostgREST filter injection
    // Remove special characters that could alter the query structure
    const sanitizedQuery = query.replace(/[(),]/g, ' ').trim()

    if (!sanitizedQuery) {
      return []
    }

    return this.executeArrayQuery('searchPropertiesText', async (supabase) => {
      const { data, error } = await supabase
        .from('properties')
        .select(
          `
            *,
            neighborhood:neighborhoods(name, city, state)
          `
        )
        .eq('is_active', true)
        .or(
          `address.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`
        )
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        this.handleSupabaseError(error, 'searchPropertiesText', {
          query: sanitizedQuery,
          limit,
        })
      }

      return data || []
    })
  }

  /**
   * Get similar properties based on criteria
   */
  async getSimilarProperties(
    referenceProperty: Property,
    limit = 10
  ): Promise<Property[]> {
    this.validateRequired({ referenceProperty })

    const priceTolerance = referenceProperty.price * 0.2 // 20% tolerance
    const bedroomRange = 1
    const bathroomRange = 0.5

    return this.executeArrayQuery('getSimilarProperties', async (supabase) => {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .neq('id', referenceProperty.id)
        .gte('price', referenceProperty.price - priceTolerance)
        .lte('price', referenceProperty.price + priceTolerance)
        .gte('bedrooms', Math.max(0, referenceProperty.bedrooms - bedroomRange))
        .lte('bedrooms', referenceProperty.bedrooms + bedroomRange)
        .gte(
          'bathrooms',
          Math.max(0, referenceProperty.bathrooms - bathroomRange)
        )
        .lte('bathrooms', referenceProperty.bathrooms + bathroomRange)

      if (referenceProperty.property_type) {
        query = query.eq('property_type', referenceProperty.property_type)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        this.handleSupabaseError(error, 'getSimilarProperties', {
          referencePropertyId: referenceProperty.id,
          limit,
        })
      }

      return data || []
    })
  }

  /**
   * Get properties with specific amenities
   */
  async getPropertiesByAmenities(
    amenities: string[],
    limit = 20
  ): Promise<Property[]> {
    this.validateRequired({ amenities })

    return this.executeArrayQuery(
      'getPropertiesByAmenities',
      async (supabase) => {
        let query = supabase
          .from('properties')
          .select('*')
          .eq('is_active', true)

        // Apply amenity filters
        amenities.forEach((amenity) => {
          query = query.contains('amenities', [amenity])
        })

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          this.handleSupabaseError(error, 'getPropertiesByAmenities', {
            amenities,
            limit,
          })
        }

        return data || []
      }
    )
  }
}
