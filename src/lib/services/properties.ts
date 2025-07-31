import { createClient } from '@/lib/supabase/server'
import {
  Property,
  PropertyInsert,
  PropertyUpdate,
  PropertyWithNeighborhood,
  Neighborhood,
  NeighborhoodInsert,
  NeighborhoodUpdate,
} from '@/types/database'
import { PropertySearch } from '@/lib/schemas/property'

export class PropertyService {
  private async getSupabase() {
    return await createClient()
  }

  // Property Operations
  async getProperty(propertyId: string): Promise<Property | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching property:', error)
      return null
    }

    return data
  }

  async getPropertyWithNeighborhood(
    propertyId: string
  ): Promise<PropertyWithNeighborhood | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        *,
        neighborhood:neighborhoods(*)
      `
      )
      .eq('id', propertyId)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching property with neighborhood:', error)
      return null
    }

    return data
  }

  async createProperty(property: PropertyInsert): Promise<Property | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select()
      .single()

    if (error) {
      console.error('Error creating property:', error)
      return null
    }

    return data
  }

  async updateProperty(
    propertyId: string,
    updates: PropertyUpdate
  ): Promise<Property | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('properties')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', propertyId)
      .select()
      .single()

    if (error) {
      console.error('Error updating property:', error)
      return null
    }

    return data
  }

  async deleteProperty(propertyId: string): Promise<boolean> {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('properties')
      .update({ is_active: false })
      .eq('id', propertyId)

    if (error) {
      console.error('Error deleting property:', error)
      return false
    }

    return true
  }

  async searchProperties(searchParams: PropertySearch): Promise<{
    properties: PropertyWithNeighborhood[]
    total: number
    page: number
    limit: number
  }> {
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

    const supabase = await this.getSupabase()
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

    // Apply filters
    if (filters.price_min !== undefined) {
      query = query.gte('price', filters.price_min)
    }
    if (filters.price_max !== undefined) {
      query = query.lte('price', filters.price_max)
    }
    if (filters.bedrooms_min !== undefined) {
      query = query.gte('bedrooms', filters.bedrooms_min)
    }
    if (filters.bedrooms_max !== undefined) {
      query = query.lte('bedrooms', filters.bedrooms_max)
    }
    if (filters.bathrooms_min !== undefined) {
      query = query.gte('bathrooms', filters.bathrooms_min)
    }
    if (filters.bathrooms_max !== undefined) {
      query = query.lte('bathrooms', filters.bathrooms_max)
    }
    if (filters.square_feet_min !== undefined) {
      query = query.gte('square_feet', filters.square_feet_min)
    }
    if (filters.square_feet_max !== undefined) {
      query = query.lte('square_feet', filters.square_feet_max)
    }
    if (filters.property_types && filters.property_types.length > 0) {
      query = query.in('property_type', filters.property_types)
    }
    if (filters.neighborhoods && filters.neighborhoods.length > 0) {
      query = query.in('neighborhood_id', filters.neighborhoods)
    }
    if (filters.year_built_min !== undefined) {
      query = query.gte('year_built', filters.year_built_min)
    }
    if (filters.year_built_max !== undefined) {
      query = query.lte('year_built', filters.year_built_max)
    }
    if (filters.lot_size_min !== undefined) {
      query = query.gte('lot_size_sqft', filters.lot_size_min)
    }
    if (filters.lot_size_max !== undefined) {
      query = query.lte('lot_size_sqft', filters.lot_size_max)
    }
    if (filters.parking_spots_min !== undefined) {
      query = query.gte('parking_spots', filters.parking_spots_min)
    }
    if (filters.listing_status && filters.listing_status.length > 0) {
      query = query.in('listing_status', filters.listing_status)
    }

    // Apply amenities filter (contains check)
    if (filters.amenities && filters.amenities.length > 0) {
      filters.amenities.forEach((amenity) => {
        query = query.contains('amenities', [amenity])
      })
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
      console.error('Error searching properties:', error)
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
  }

  async getPropertiesByNeighborhood(
    neighborhoodId: string,
    limit = 20
  ): Promise<Property[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('neighborhood_id', neighborhoodId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching properties by neighborhood:', error)
      return []
    }

    return data || []
  }

  async getPropertiesByZpid(zpid: string): Promise<Property | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('zpid', zpid)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching property by ZPID:', error)
      return null
    }

    return data
  }

  async getPropertiesByHash(hash: string): Promise<Property | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('property_hash', hash)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching property by hash:', error)
      return null
    }

    return data
  }

  // Neighborhood Operations
  async getNeighborhood(neighborhoodId: string): Promise<Neighborhood | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('id', neighborhoodId)
      .single()

    if (error) {
      console.error('Error fetching neighborhood:', error)
      return null
    }

    return data
  }

  async createNeighborhood(
    neighborhood: NeighborhoodInsert
  ): Promise<Neighborhood | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('neighborhoods')
      .insert(neighborhood)
      .select()
      .single()

    if (error) {
      console.error('Error creating neighborhood:', error)
      return null
    }

    return data
  }

  async updateNeighborhood(
    neighborhoodId: string,
    updates: NeighborhoodUpdate
  ): Promise<Neighborhood | null> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('neighborhoods')
      .update(updates)
      .eq('id', neighborhoodId)
      .select()
      .single()

    if (error) {
      console.error('Error updating neighborhood:', error)
      return null
    }

    return data
  }

  async getNeighborhoodsByCity(
    city: string,
    state: string
  ): Promise<Neighborhood[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('city', city)
      .eq('state', state)
      .order('name')

    if (error) {
      console.error('Error fetching neighborhoods by city:', error)
      return []
    }

    return data || []
  }

  async getNeighborhoodsByMetroArea(
    metroArea: string
  ): Promise<Neighborhood[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('*')
      .eq('metro_area', metroArea)
      .order('name')

    if (error) {
      console.error('Error fetching neighborhoods by metro area:', error)
      return []
    }

    return data || []
  }

  async searchNeighborhoods(searchTerm: string): Promise<Neighborhood[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('neighborhoods')
      .select('*')
      .or(
        `name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,metro_area.ilike.%${searchTerm}%`
      )
      .order('name')
      .limit(20)

    if (error) {
      console.error('Error searching neighborhoods:', error)
      return []
    }

    return data || []
  }

  // Geographic Operations
  async getPropertiesWithinRadius(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    limit = 50
  ): Promise<PropertyWithNeighborhood[]> {
    // Use PostGIS ST_DWithin function for geographic queries
    const supabase = await this.getSupabase()
    const { data, error } = await supabase.rpc('get_properties_within_radius', {
      center_lat: centerLat,
      center_lng: centerLng,
      radius_km: radiusKm,
      limit_count: limit,
    })

    if (error) {
      console.error('Error fetching properties within radius:', error)
      return []
    }

    return data || []
  }

  async getPropertiesInNeighborhood(
    neighborhoodId: string
  ): Promise<PropertyWithNeighborhood[]> {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        *,
        neighborhood:neighborhoods(*)
      `
      )
      .eq('neighborhood_id', neighborhoodId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching properties in neighborhood:', error)
      return []
    }

    return data || []
  }

  // Analytics
  async getPropertyStats() {
    const supabase = await this.getSupabase()
    const { data, error } = await supabase
      .from('properties')
      .select('price, bedrooms, bathrooms, square_feet, property_type')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching property stats:', error)
      return null
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
  }

  async getNeighborhoodStats(neighborhoodId: string) {
    const [properties, neighborhood] = await Promise.all([
      this.getPropertiesByNeighborhood(neighborhoodId, 1000),
      this.getNeighborhood(neighborhoodId),
    ])

    if (!neighborhood) {
      return null
    }

    const totalProperties = properties.length
    if (totalProperties === 0) {
      return {
        neighborhood,
        total_properties: 0,
        avg_price: 0,
        price_range: { min: 0, max: 0 },
        avg_bedrooms: 0,
        avg_bathrooms: 0,
      }
    }

    const prices = properties.map((p) => p.price)
    const avgPrice =
      prices.reduce((sum, price) => sum + price, 0) / totalProperties
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    const avgBedrooms =
      properties.reduce((sum, p) => sum + p.bedrooms, 0) / totalProperties
    const avgBathrooms =
      properties.reduce((sum, p) => sum + p.bathrooms, 0) / totalProperties

    return {
      neighborhood,
      total_properties: totalProperties,
      avg_price: Math.round(avgPrice),
      price_range: { min: minPrice, max: maxPrice },
      avg_bedrooms: Math.round(avgBedrooms * 10) / 10,
      avg_bathrooms: Math.round(avgBathrooms * 10) / 10,
    }
  }
}
