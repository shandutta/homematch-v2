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
} from '@/lib/services/interfaces'
import { BaseService } from '@/lib/services/base'
import { createTypedRPC } from '@/lib/services/supabase-rpc-types'
import { PropertyFilterBuilder } from '@/lib/services/filters/PropertyFilterBuilder'

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
  async getPropertyStats(): Promise<{
    total: number
    active: number
    avgPrice: number
  }> {
    return this.executeQuery('getPropertyStats', async (supabase) => {
      // Get counts and basic stats
      const [totalResult, activeResult, priceResult] = await Promise.all([
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase.from('properties').select('price').eq('is_active', true),
      ])

      if (totalResult.error || activeResult.error || priceResult.error) {
        const error =
          totalResult.error || activeResult.error || priceResult.error
        this.handleSupabaseError(error!, 'getPropertyStats', {})
      }

      const total = totalResult.count || 0
      const active = activeResult.count || 0
      const prices = priceResult.data?.map((p) => p.price) || []
      const avgPrice =
        prices.length > 0
          ? prices.reduce((sum, price) => sum + price, 0) / prices.length
          : 0

      return {
        total,
        active,
        avgPrice: Math.round(avgPrice),
      }
    })
  }

  /**
   * Advanced text search across property fields
   */
  async searchPropertiesText(query: string, limit = 20): Promise<Property[]> {
    this.validateRequired({ query })

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
          `
            address.ilike.%${query}%,
            description.ilike.%${query}%,
            neighborhood.name.ilike.%${query}%,
            neighborhood.city.ilike.%${query}%
          `
        )
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        this.handleSupabaseError(error, 'searchPropertiesText', {
          query,
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
      const { data, error } = await supabase
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
        .eq('property_type', referenceProperty.property_type || 'unknown')
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
