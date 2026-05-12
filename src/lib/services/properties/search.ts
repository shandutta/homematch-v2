/**
 * PropertySearchService
 *
 * Specialized service for property search operations, analytics, and filtering.
 * Handles complex search queries, geographic filtering, and performance metrics.
 */

import type { Property, PropertyWithNeighborhood } from '@/types/database'
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

// Explicit column projections per audit M13 — search.ts is the HOT PATH
// in the property service layer (dashboard, validation, Zillow mirroring).
// Mirrors every column on public.properties Row so callers consuming the
// typed Property/PropertyWithNeighborhood continue to work; the swap from
// `*` is purely to make the wire projection auditable and to protect
// against future schema growth adding wide columns we don't need.
const PROPERTY_FULL_COLS =
  'address, amenities, bathrooms, bedrooms, city, coordinates, created_at, description, id, images, is_active, last_refreshed_at, listing_status, lot_size_sqft, neighborhood_id, parking_spots, price, property_hash, property_type, source_fingerprint, square_feet, state, updated_at, year_built, zip_code, zillow_images_refreshed_at, zillow_images_refreshed_count, zillow_images_refresh_status, zpid'
const NEIGHBORHOOD_FULL_COLS =
  'bounds, city, created_at, id, median_price, metro_area, name, state, transit_score, walk_score'

const toRoundedNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? Math.round(numeric) : 0
}

const toRoundedTenth = (value: unknown): number => {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? Math.round(numeric * 10) / 10 : 0
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizePropertyStatsRpcRow = (row: unknown): PropertyStats => {
  if (!isRecord(row)) {
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

  const distribution = row.property_type_distribution
  return {
    total_properties: toRoundedNumber(row.total_properties),
    avg_price: toRoundedNumber(row.avg_price),
    median_price: toRoundedNumber(row.median_price),
    avg_bedrooms: toRoundedTenth(row.avg_bedrooms),
    avg_bathrooms: toRoundedTenth(row.avg_bathrooms),
    avg_square_feet: toRoundedNumber(row.avg_square_feet),
    property_type_distribution: isRecord(distribution)
      ? Object.fromEntries(
          Object.entries(distribution).filter(
            (entry): entry is [string, number] => typeof entry[1] === 'number'
          )
        )
      : {},
  }
}

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
    searchParams: PropertySearch,
    options: {
      select?: string
      includeCount?: boolean
      includeNeighborhoods?: boolean
    } = {}
  ): Promise<PropertySearchResult> {
    this.validateRequired({ searchParams })

    const { filters = {}, pagination } = searchParams
    const page = pagination?.page ?? 1
    const limit = pagination?.limit ?? 20
    const sort = pagination?.sort

    try {
      const supabase = await this.getSupabase()

      const includeNeighborhoods = options.includeNeighborhoods ?? true
      const selectClause =
        options.select ||
        (includeNeighborhoods
          ? `${PROPERTY_FULL_COLS}, neighborhood:neighborhoods(${NEIGHBORHOOD_FULL_COLS})`
          : PROPERTY_FULL_COLS)

      const shouldCount = options.includeCount ?? true

      // Build base query with optional neighborhood join/count
      let query = supabase
        .from('properties')
        .select(selectClause, shouldCount ? { count: 'exact' } : undefined)
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

      const { data, error, count } =
        await query.returns<PropertyWithNeighborhood[]>()

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
          .select(PROPERTY_FULL_COLS)
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

        return data ?? []
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

        return data ?? []
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
            `${PROPERTY_FULL_COLS}, neighborhood:neighborhoods!inner(name, city, state)`
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
    const fallbackStats: PropertyStats = {
      total_properties: 0,
      avg_price: 0,
      median_price: 0,
      avg_bedrooms: 0,
      avg_bathrooms: 0,
      avg_square_feet: 0,
      property_type_distribution: {},
    }

    const result = await this.executeQuery(
      'getPropertyStats',
      async (supabase) => {
        const { data, error } = await supabase.rpc('get_property_stats', {})

        if (error) {
          this.handleSupabaseError(error, 'getPropertyStats', {})
        }

        return normalizePropertyStatsRpcRow(data)
      }
    )

    return result ?? fallbackStats
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
          `${PROPERTY_FULL_COLS}, neighborhood:neighborhoods(name, city, state)`
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
        .select(PROPERTY_FULL_COLS)
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
          .select(PROPERTY_FULL_COLS)
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
