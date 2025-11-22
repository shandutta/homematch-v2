import { NeighborhoodInsert, PropertyInsert } from '@/types/database'
import {
  neighborhoodInsertSchema,
  propertyInsertSchema,
  type PropertyType,
} from '@/lib/schemas/property'
import { getStateForMetroArea } from './metro-state-mapping'
import crypto from 'node:crypto'

// Raw data types from CSV/JSON files
export interface RawNeighborhoodData {
  metro_area: string
  name: string
  region?: string
  polygon: string // comma-separated coordinates
  city: string
  state?: string
}

export interface RawPropertyData {
  id?: string
  zpid?: string
  address: string
  city: string
  state: string
  zip_code: string
  price: string | number
  bedrooms: string | number
  bathrooms: string | number
  square_feet?: string | number
  lot_size?: string | number
  year_built?: string | number
  property_type?: string
  listing_status?: string
  images?: string | string[]
  created_at?: string
  updated_at?: string
  neighborhood_id?: string
  latitude?: string | number
  longitude?: string | number
  neighborhood?: string
  property_hash?: string
}

// Transformation result types
export interface TransformationResult<T> {
  success: boolean
  data?: T
  errors: string[]
  warnings: string[]
}

export interface MigrationStats {
  total_processed: number
  successful: number
  failed: number
  skipped: number
  errors: Array<{
    index: number
    data: RawNeighborhoodData | RawPropertyData | Record<string, unknown> | null
    errors: string[]
  }>
}

export class DataTransformer {
  private readonly DEFAULT_STATE = 'CA' // Default state for missing data

  /**
   * Transform raw neighborhood data to database format
   */
  transformNeighborhood(
    raw: RawNeighborhoodData,
    _index: number = 0
  ): TransformationResult<NeighborhoodInsert> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Basic validation
      if (!raw.name?.trim()) {
        errors.push('Missing neighborhood name')
      }
      if (!raw.city?.trim()) {
        errors.push('Missing city')
      }
      if (!raw.metro_area?.trim()) {
        errors.push('Missing metro area')
      }

      // Transform polygon coordinates
      let bounds = null
      if (raw.polygon) {
        try {
          bounds = this.transformPolygonCoordinates(raw.polygon)
        } catch (error) {
          warnings.push(
            `Invalid polygon format: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }

      // Create neighborhood insert object with correct state mapping
      const neighborhood: NeighborhoodInsert = {
        name: raw.name?.trim() || '',
        city: raw.city?.trim() || '',
        state: raw.state?.trim() || getStateForMetroArea(raw.metro_area || ''),
        metro_area: raw.metro_area?.trim() || null,
        bounds: bounds,
        median_price: null, // Will be calculated later
        walk_score: null,
        transit_score: null,
      }

      // Validate with schema
      const validationResult = neighborhoodInsertSchema.safeParse(neighborhood)
      if (!validationResult.success) {
        validationResult.error.errors.forEach((err) => {
          errors.push(`${err.path.join('.')}: ${err.message}`)
        })
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings }
      }

      return {
        success: true,
        data: neighborhood,
        errors: [],
        warnings,
      }
    } catch (error) {
      errors.push(
        `Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return { success: false, errors, warnings }
    }
  }

  /**
   * Transform raw property data to database format
   */
  transformProperty(
    raw: RawPropertyData,
    _index: number = 0
  ): TransformationResult<PropertyInsert> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Basic validation
      if (!raw.address?.trim()) {
        errors.push('Missing address')
      }
      if (!raw.city?.trim()) {
        errors.push('Missing city')
      }
      if (!raw.state?.trim()) {
        errors.push('Missing state')
      }
      if (!raw.zip_code?.toString().trim()) {
        errors.push('Missing zip code')
      }

      // Parse numeric fields
      const price = this.parseNumber(raw.price, 'price')
      if (price.errors.length > 0) {
        errors.push(...price.errors)
      }

      const bedrooms = this.parseNumber(raw.bedrooms, 'bedrooms')
      if (bedrooms.errors.length > 0) {
        errors.push(...bedrooms.errors)
      }

      const bathrooms = this.parseNumber(raw.bathrooms, 'bathrooms')
      if (bathrooms.errors.length > 0) {
        errors.push(...bathrooms.errors)
      }

      const squareFeet = this.parseNumber(raw.square_feet, 'square_feet', true)
      const lotSize = this.parseNumber(raw.lot_size, 'lot_size', true)
      const yearBuilt = this.parseNumber(raw.year_built, 'year_built', true)

      // Transform coordinates
      let coordinates = null
      if (raw.latitude && raw.longitude) {
        try {
          const lat = parseFloat(raw.latitude.toString())
          const lng = parseFloat(raw.longitude.toString())
          if (!isNaN(lat) && !isNaN(lng)) {
            // Use GeoJSON Point to avoid PostgREST parse errors on POINT syntax
            coordinates = {
              type: 'Point',
              coordinates: [lng, lat],
            }
          }
        } catch (_error) {
          warnings.push('Invalid coordinate format')
        }
      }

      // Transform images
      let images: string[] = []
      if (raw.images) {
        try {
          if (typeof raw.images === 'string') {
            // Parse JSON string
            const parsed = JSON.parse(raw.images)
            images = Array.isArray(parsed) ? parsed : []
          } else if (Array.isArray(raw.images)) {
            images = raw.images
          }
        } catch (_error) {
          warnings.push('Invalid images format')
        }
      }

      // Validate property type (aligns with schema enum)
      const rawPropertyType = raw.property_type?.toString().toLowerCase()
      const propertyTypeMap: Record<string, PropertyType> = {
        single_family: 'single_family',
        house: 'single_family',
        condo: 'condo',
        condominium: 'condo',
        townhome: 'townhome',
        townhouse: 'townhome',
        multi_family: 'multi_family',
        multifamily: 'multi_family',
        apartment: 'multi_family',
        multifamily_dwelling: 'multi_family',
        manufactured: 'manufactured',
        mobile: 'manufactured',
        land: 'land',
        lot: 'land',
        other: 'other',
      }
      let propertyType = rawPropertyType
        ? propertyTypeMap[rawPropertyType] || undefined
        : undefined

      if (rawPropertyType && !propertyType) {
        warnings.push(
          `Unknown property type: ${raw.property_type}, defaulting to other`
        )
        propertyType = 'other'
      } else if (!propertyType) {
        propertyType = 'single_family'
      }

      // Create property insert object
      const cappedBedrooms =
        bedrooms.value === null || bedrooms.value === undefined
          ? 0
          : Math.min(bedrooms.value, 20)
      if (bedrooms.value !== null && bedrooms.value !== undefined && bedrooms.value > 20) {
        warnings.push(`Bedrooms capped at 20 from ${bedrooms.value}`)
      }

      const cappedBathrooms =
        bathrooms.value === null || bathrooms.value === undefined
          ? 0
          : Math.min(bathrooms.value, 20)
      if (bathrooms.value !== null && bathrooms.value !== undefined && bathrooms.value > 20) {
        warnings.push(`Bathrooms capped at 20 from ${bathrooms.value}`)
      }

      const property: PropertyInsert = {
        zpid: raw.zpid?.toString() || null,
        address: raw.address?.trim() || '',
        city: raw.city?.trim() || '',
        state: raw.state?.trim() || this.DEFAULT_STATE,
        zip_code: raw.zip_code?.toString().trim() || '',
        price: price.value || 0,
        bedrooms: cappedBedrooms,
        bathrooms: cappedBathrooms,
        square_feet: squareFeet.value,
        property_type: propertyType || null,
        images: images.length > 0 ? images : null,
        description: null,
        coordinates: coordinates,
        neighborhood_id: null, // Set to null to avoid foreign key issues
        amenities: null,
        year_built: yearBuilt.value,
        lot_size_sqft: lotSize.value,
        parking_spots: null,
        listing_status: raw.listing_status || 'active',
        property_hash: raw.property_hash || null,
        is_active: true,
      }

      // Validate with schema
      const validationResult = propertyInsertSchema.safeParse(property)
      if (!validationResult.success) {
        validationResult.error.errors.forEach((err) => {
          errors.push(`${err.path.join('.')}: ${err.message}`)
        })
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings }
      }

      return {
        success: true,
        data: property,
        errors: [],
        warnings,
      }
    } catch (error) {
      errors.push(
        `Transformation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      return { success: false, errors, warnings }
    }
  }

  /**
   * Parse number with error handling
   */
  private parseNumber(
    value: string | number | undefined | null,
    fieldName: string,
    optional: boolean = false
  ): { value: number | null; errors: string[] } {
    if (value === undefined || value === null || value === '') {
      if (optional) {
        return { value: null, errors: [] }
      }
      return { value: null, errors: [`Missing required field: ${fieldName}`] }
    }

    const numValue =
      typeof value === 'number' ? value : parseFloat(value.toString())

    if (isNaN(numValue)) {
      return {
        value: null,
        errors: [`Invalid number format for ${fieldName}: ${value}`],
      }
    }

    if (numValue < 0) {
      return {
        value: null,
        errors: [`Negative value not allowed for ${fieldName}: ${numValue}`],
      }
    }

    return { value: numValue, errors: [] }
  }

  /**
   * Transform polygon coordinates from string format to PostGIS POLYGON
   */
  private transformPolygonCoordinates(polygon: string): string {
    if (!polygon || !polygon.trim()) {
      throw new Error('Empty polygon string')
    }

    // Parse coordinates from comma-separated string
    const coords = polygon.split(',').map((coord) => parseFloat(coord.trim()))

    if (coords.length % 2 !== 0) {
      throw new Error('Odd number of coordinates')
    }

    if (coords.some(isNaN)) {
      throw new Error('Invalid coordinate values')
    }

    // Group coordinates into lat/lng pairs and convert to PostGIS format
    const points: string[] = []
    for (let i = 0; i < coords.length; i += 2) {
      const lat = coords[i]
      const lng = coords[i + 1]

      // Validate coordinate ranges
      if (lat < -90 || lat > 90) {
        throw new Error(`Invalid latitude: ${lat}`)
      }
      if (lng < -180 || lng > 180) {
        throw new Error(`Invalid longitude: ${lng}`)
      }

      // PostGIS format: longitude first, then latitude
      points.push(`${lng} ${lat}`)
    }

    // Ensure polygon is closed (first point equals last point)
    if (points.length > 0 && points[0] !== points[points.length - 1]) {
      points.push(points[0])
    }

    if (points.length < 4) {
      throw new Error(
        'Polygon must have at least 4 points (including closing point)'
      )
    }

    // PostgreSQL polygon format: ((x1,y1),(x2,y2),(x3,y3)...)
    return `(${points.map((point) => `(${point.replace(' ', ',')})`).join(',')})`
  }

  /**
   * Generate hash for deduplication
   */
  generatePropertyHash(property: RawPropertyData): string {
    const key = `${property.address}_${property.city}_${property.state}_${property.zip_code}_${property.price}`
    return crypto.createHash('md5').update(key.toLowerCase()).digest('hex')
  }

  /**
   * Validate geographic coordinates
   */
  validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }

  /**
   * Batch transform neighborhoods
   */
  transformNeighborhoods(rawData: RawNeighborhoodData[]): {
    successful: NeighborhoodInsert[]
    stats: MigrationStats
  } {
    const successful: NeighborhoodInsert[] = []
    const stats: MigrationStats = {
      total_processed: rawData.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    }

    rawData.forEach((raw, index) => {
      const result = this.transformNeighborhood(raw, index)

      if (result.success && result.data) {
        successful.push(result.data)
        stats.successful++
      } else {
        stats.failed++
        stats.errors.push({
          index,
          data: raw,
          errors: result.errors,
        })
      }
    })

    return { successful, stats }
  }

  /**
   * Batch transform properties
   */
  transformProperties(rawData: RawPropertyData[]): {
    successful: PropertyInsert[]
    stats: MigrationStats
  } {
    const successful: PropertyInsert[] = []
    const stats: MigrationStats = {
      total_processed: rawData.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    }

    rawData.forEach((raw, index) => {
      // Add property hash for deduplication
      if (!raw.property_hash) {
        raw.property_hash = this.generatePropertyHash(raw)
      }

      const result = this.transformProperty(raw, index)

      if (result.success && result.data) {
        successful.push(result.data)
        stats.successful++
      } else {
        stats.failed++
        stats.errors.push({
          index,
          data: raw,
          errors: result.errors,
        })
      }
    })

    return { successful, stats }
  }
}
