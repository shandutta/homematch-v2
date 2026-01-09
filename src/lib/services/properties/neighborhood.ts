/**
 * NeighborhoodService
 *
 * Specialized service for neighborhood management operations.
 * Handles CRUD operations, search, and geographic queries for neighborhoods.
 */

import type {
  Neighborhood,
  NeighborhoodInsert,
  NeighborhoodUpdate,
} from '@/types/database'
import type {
  INeighborhoodService,
  ISupabaseClientFactory,
} from '@/lib/services/interfaces'
import { BaseService } from '@/lib/services/base'
import { createTypedRPC } from '@/lib/services/supabase-rpc-types'

export class NeighborhoodService
  extends BaseService
  implements INeighborhoodService
{
  constructor(clientFactory?: ISupabaseClientFactory) {
    super(clientFactory)
  }

  /**
   * Get a neighborhood by ID
   */
  async getNeighborhood(neighborhoodId: string): Promise<Neighborhood | null> {
    this.validateRequired({ neighborhoodId })

    return this.executeSingleQuery('getNeighborhood', async (supabase) => {
      const { data, error } = await supabase
        .from('neighborhoods')
        .select('*')
        .eq('id', neighborhoodId)
        .single()

      if (error) {
        if (this.isNotFoundError(error)) {
          return null
        }
        this.handleSupabaseError(error, 'getNeighborhood', { neighborhoodId })
      }

      return data
    })
  }

  /**
   * Create a new neighborhood
   */
  async createNeighborhood(
    neighborhood: NeighborhoodInsert
  ): Promise<Neighborhood | null> {
    this.validateRequired({ neighborhood })

    return this.executeSingleQuery('createNeighborhood', async (supabase) => {
      const sanitizedNeighborhood = this.sanitizeInput(neighborhood)
      const { data, error } = await supabase
        .from('neighborhoods')
        .insert(sanitizedNeighborhood)
        .select()
        .single()

      if (error) {
        this.handleSupabaseError(error, 'createNeighborhood', { neighborhood })
      }

      return data
    })
  }

  /**
   * Update an existing neighborhood
   */
  async updateNeighborhood(
    neighborhoodId: string,
    updates: NeighborhoodUpdate
  ): Promise<Neighborhood | null> {
    this.validateRequired({ neighborhoodId, updates })

    return this.executeSingleQuery('updateNeighborhood', async (supabase) => {
      const sanitizedUpdates = this.sanitizeInput(updates)
      const { data, error } = await supabase
        .from('neighborhoods')
        .update({
          ...sanitizedUpdates,
        })
        .eq('id', neighborhoodId)
        .select()
        .single()

      if (error) {
        this.handleSupabaseError(error, 'updateNeighborhood', {
          neighborhoodId,
          updates,
        })
      }

      return data
    })
  }

  /**
   * Get neighborhoods by city and state
   */
  async getNeighborhoodsByCity(
    city: string,
    state: string
  ): Promise<Neighborhood[]> {
    this.validateRequired({ city, state })

    return this.executeArrayQuery(
      'getNeighborhoodsByCity',
      async (supabase) => {
        const { data, error } = await supabase
          .from('neighborhoods')
          .select('*')
          .eq('city', city)
          .eq('state', state)
          .order('name')

        if (error) {
          this.handleSupabaseError(error, 'getNeighborhoodsByCity', {
            city,
            state,
          })
        }

        return data || []
      }
    )
  }

  /**
   * Get neighborhoods by metropolitan area
   */
  async getNeighborhoodsByMetroArea(
    metroArea: string
  ): Promise<Neighborhood[]> {
    this.validateRequired({ metroArea })

    return this.executeArrayQuery(
      'getNeighborhoodsByMetroArea',
      async (supabase) => {
        const { data, error } = await supabase
          .from('neighborhoods')
          .select('*')
          .eq('metro_area', metroArea)
          .order('name')

        if (error) {
          this.handleSupabaseError(error, 'getNeighborhoodsByMetroArea', {
            metroArea,
          })
        }

        return data || []
      }
    )
  }

  /**
   * Search neighborhoods by name, city, or metro area
   */
  async searchNeighborhoods(query: string): Promise<Neighborhood[]> {
    this.validateRequired({ query })

    return this.executeArrayQuery('searchNeighborhoods', async (supabase) => {
      const searchTerm = this.sanitizeInput(query)
      const { data, error } = await supabase
        .from('neighborhoods')
        .select('*')
        .or(
          `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,metro_area.ilike.%${searchTerm}%`
        )
        .order('name')
        .limit(20)

      if (error) {
        this.handleSupabaseError(error, 'searchNeighborhoods', { query })
      }

      return data || []
    })
  }

  /**
   * Get neighborhoods within a geographic bounding box
   */
  async getNeighborhoodsInBounds(
    northEast: { lat: number; lng: number },
    southWest: { lat: number; lng: number }
  ): Promise<Neighborhood[]> {
    this.validateRequired({ northEast, southWest })

    return this.executeArrayQuery(
      'getNeighborhoodsInBounds',
      async (supabase) => {
        const rpc = createTypedRPC(supabase)
        const { data, error } = await rpc.get_neighborhoods_in_bounds({
          north_lat: northEast.lat,
          south_lat: southWest.lat,
          east_lng: northEast.lng,
          west_lng: southWest.lng,
        })

        if (error) {
          this.handleSupabaseError(error, 'getNeighborhoodsInBounds', {
            northEast,
            southWest,
          })
        }

        return data || []
      }
    )
  }

  /**
   * Get neighborhoods with property count statistics
   */
  async getNeighborhoodsWithStats(
    city?: string,
    state?: string
  ): Promise<Record<string, unknown>[]> {
    return this.executeArrayQuery(
      'getNeighborhoodsWithStats',
      async (supabase) => {
        let query = supabase.from('neighborhoods').select(`
            *,
            property_count:properties(count)
          `)

        if (city) {
          query = query.eq('city', city)
        }
        if (state) {
          query = query.eq('state', state)
        }

        const { data, error } = await query.order('name')

        if (error) {
          this.handleSupabaseError(error, 'getNeighborhoodsWithStats', {
            city,
            state,
          })
        }

        return data || []
      }
    )
  }

  /**
   * Get popular neighborhoods based on property activity
   */
  async getPopularNeighborhoods(limit = 10): Promise<Neighborhood[]> {
    return this.executeArrayQuery(
      'getPopularNeighborhoods',
      async (supabase) => {
        // TODO: Implement get_popular_neighborhoods RPC function in database
        // For now, get neighborhoods with most properties as fallback
        const { data, error } = await supabase
          .from('neighborhoods')
          .select(
            `
            *,
            property_count:properties(count)
          `
          )
          .order('property_count', { ascending: false })
          .limit(limit)

        if (error) {
          this.handleSupabaseError(error, 'getPopularNeighborhoods', { limit })
        }

        return data || []
      }
    )
  }

  /**
   * Get neighborhood with detailed analytics
   */
  async getNeighborhoodAnalytics(
    neighborhoodId: string
  ): Promise<Record<string, unknown> | null> {
    this.validateRequired({ neighborhoodId })

    return this.executeQuery('getNeighborhoodAnalytics', async (supabase) => {
      const [neighborhood, properties, stats] = await Promise.all([
        // Get neighborhood details
        supabase
          .from('neighborhoods')
          .select('*')
          .eq('id', neighborhoodId)
          .single(),

        // Get properties in neighborhood
        supabase
          .from('properties')
          .select('price, bedrooms, bathrooms, square_feet, property_type')
          .eq('neighborhood_id', neighborhoodId)
          .eq('is_active', true),

        // TODO: Implement get_neighborhood_interaction_stats RPC function
        // For now, return empty stats as fallback
        Promise.resolve({ data: null, error: null }),
      ])

      if (neighborhood.error) {
        this.handleSupabaseError(
          neighborhood.error,
          'getNeighborhoodAnalytics',
          { neighborhoodId }
        )
      }

      const propertyData = properties.data || []
      const totalProperties = propertyData.length

      if (totalProperties === 0) {
        return {
          neighborhood: neighborhood.data,
          analytics: {
            total_properties: 0,
            avg_price: 0,
            price_range: { min: 0, max: 0 },
            avg_bedrooms: 0,
            avg_bathrooms: 0,
            avg_square_feet: 0,
            property_type_distribution: {},
            interaction_stats: stats.data || {},
          },
        }
      }

      // Calculate analytics
      const prices = propertyData.map((p) => p.price)
      const avgPrice =
        prices.reduce((sum, price) => sum + price, 0) / totalProperties
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)

      const avgBedrooms =
        propertyData.reduce((sum, p) => sum + p.bedrooms, 0) / totalProperties
      const avgBathrooms =
        propertyData.reduce((sum, p) => sum + p.bathrooms, 0) / totalProperties

      const propertiesWithSquareFeet = propertyData.filter(
        (p) => p.square_feet !== null
      )
      const avgSquareFeet =
        propertiesWithSquareFeet.length > 0
          ? propertiesWithSquareFeet.reduce(
              (sum, p) => sum + (p.square_feet || 0),
              0
            ) / propertiesWithSquareFeet.length
          : 0

      const typeDistribution = propertyData.reduce<Record<string, number>>(
        (acc, p) => {
          const type = p.property_type || 'unknown'
          acc[type] = (acc[type] || 0) + 1
          return acc
        },
        {}
      )

      return {
        neighborhood: neighborhood.data,
        analytics: {
          total_properties: totalProperties,
          avg_price: Math.round(avgPrice),
          price_range: { min: minPrice, max: maxPrice },
          avg_bedrooms: Math.round(avgBedrooms * 10) / 10,
          avg_bathrooms: Math.round(avgBathrooms * 10) / 10,
          avg_square_feet: Math.round(avgSquareFeet),
          property_type_distribution: typeDistribution,
          interaction_stats: stats.data || {},
        },
      }
    })
  }

  /**
   * Delete a neighborhood (admin operation)
   */
  async deleteNeighborhood(neighborhoodId: string): Promise<boolean> {
    this.validateRequired({ neighborhoodId })

    return this.executeBooleanQuery('deleteNeighborhood', async (supabase) => {
      // First check if neighborhood has properties
      const { count, error: countError } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('neighborhood_id', neighborhoodId)

      if (countError) {
        this.handleSupabaseError(countError, 'deleteNeighborhood', {
          neighborhoodId,
        })
      }

      if (count && count > 0) {
        throw new Error(
          `Cannot delete neighborhood: ${count} properties still reference it`
        )
      }

      const { error } = await supabase
        .from('neighborhoods')
        .delete()
        .eq('id', neighborhoodId)

      if (error) {
        this.handleSupabaseError(error, 'deleteNeighborhood', {
          neighborhoodId,
        })
      }

      return true
    })
  }
}
