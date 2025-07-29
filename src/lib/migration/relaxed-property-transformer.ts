/**
 * Relaxed Property Data Transformer
 * More lenient validation to maximize property data retention
 */

import { PropertyInsert } from '@/types/database'
import { propertyInsertSchema } from '@/lib/schemas/property'
import { RawPropertyData, TransformationResult } from './data-transformer'

export class RelaxedPropertyTransformer {
  private readonly DEFAULT_STATE = 'CA'
  private readonly DEFAULT_BEDROOMS = 1 // Relaxed: land parcels/studios default to 1
  private readonly DEFAULT_BATHROOMS = 1 // Relaxed: assume at least 1 bathroom

  /**
   * Transform raw property data with relaxed validation
   */
  transformProperty(
    raw: RawPropertyData,
    index: number = 0
  ): TransformationResult<PropertyInsert> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Relaxed validation - only address is absolutely required
      if (!raw.address?.trim()) {
        errors.push('Missing address - this is required')
      }

      // Extract city/state/zip from address if missing
      let city = raw.city?.trim() || ''
      let state = raw.state?.trim() || ''
      let zipCode = raw.zip_code?.toString().trim() || ''

      if (!city || !state || !zipCode) {
        const addressParts = this.extractLocationFromAddress(raw.address || '')
        if (!city) city = addressParts.city || 'Unknown'
        if (!state) state = addressParts.state || this.DEFAULT_STATE
        if (!zipCode) zipCode = addressParts.zipCode || '00000'

        if (city === 'Unknown' || zipCode === '00000') {
          warnings.push('Extracted location data from address')
        }
      }

      // Parse numeric fields with defaults
      const price = this.parseNumberWithDefault(raw.price, 0, 'price')
      const bedrooms = this.parseNumberWithDefault(
        raw.bedrooms,
        this.DEFAULT_BEDROOMS,
        'bedrooms'
      )
      const bathrooms = this.parseNumberWithDefault(
        raw.bathrooms,
        this.DEFAULT_BATHROOMS,
        'bathrooms'
      )

      // Optional fields - no errors if missing
      const squareFeet = this.parseNumberWithDefault(
        raw.square_feet,
        null,
        'square_feet',
        true
      )
      const lotSize = this.parseNumberWithDefault(
        raw.lot_size,
        null,
        'lot_size',
        true
      )
      const yearBuilt = this.parseNumberWithDefault(
        raw.year_built,
        null,
        'year_built',
        true
      )

      // Add warnings for zero values that were defaulted
      if (raw.bedrooms === 0 || raw.bedrooms === '0') {
        warnings.push(`Zero bedrooms defaulted to ${this.DEFAULT_BEDROOMS}`)
      }
      if (raw.bathrooms === 0 || raw.bathrooms === '0') {
        warnings.push(`Zero bathrooms defaulted to ${this.DEFAULT_BATHROOMS}`)
      }

      // Transform coordinates (no error if missing)
      let coordinates = null
      if (raw.latitude && raw.longitude) {
        try {
          const lat = parseFloat(raw.latitude.toString())
          const lng = parseFloat(raw.longitude.toString())
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates = `(${lng},${lat})` // PostgreSQL point format: (lng,lat)
          }
        } catch (error) {
          warnings.push('Invalid coordinate format')
        }
      }

      // Transform images (no error if missing)
      let images: string[] = []
      if (raw.images) {
        try {
          if (typeof raw.images === 'string') {
            const parsed = JSON.parse(raw.images)
            images = Array.isArray(parsed) ? parsed : []
          } else if (Array.isArray(raw.images)) {
            images = raw.images
          }
        } catch (error) {
          warnings.push('Invalid images format')
        }
      }

      // Relaxed property type validation
      const validPropertyTypes = ['house', 'condo', 'townhouse', 'apartment']
      let propertyType = raw.property_type?.toLowerCase()
      if (propertyType === 'multi_family') {
        propertyType = 'apartment'
      }
      if (!propertyType || !validPropertyTypes.includes(propertyType)) {
        propertyType = 'house' // Default to house
        if (raw.property_type) {
          warnings.push(
            `Unknown property type: ${raw.property_type}, defaulting to house`
          )
        }
      }

      // Create property insert object
      const property: PropertyInsert = {
        zpid: raw.zpid?.toString() || null,
        address: raw.address?.trim() || '',
        city: city,
        state: state,
        zip_code: zipCode,
        price: price.value || 0,
        bedrooms: bedrooms.value || this.DEFAULT_BEDROOMS,
        bathrooms: bathrooms.value || this.DEFAULT_BATHROOMS,
        square_feet: squareFeet.value,
        property_type: (propertyType as any) || 'house',
        images: images.length > 0 ? images : null,
        description: null,
        coordinates: coordinates as any,
        neighborhood_id: null, // Set to null to avoid foreign key issues
        amenities: null,
        year_built: yearBuilt.value,
        lot_size_sqft: lotSize.value,
        parking_spots: null,
        listing_status: raw.listing_status || 'active',
        property_hash: raw.property_hash || this.generateHash(raw),
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
   * Parse number with default value (relaxed)
   */
  private parseNumberWithDefault(
    value: string | number | undefined | null,
    defaultValue: number | null,
    fieldName: string,
    optional: boolean = false
  ): { value: number | null; errors: string[] } {
    if (value === undefined || value === null || value === '') {
      return { value: defaultValue, errors: [] }
    }

    const numValue =
      typeof value === 'number' ? value : parseFloat(value.toString())

    if (isNaN(numValue)) {
      return { value: defaultValue, errors: [] } // No error, just use default
    }

    if (numValue < 0) {
      return { value: defaultValue, errors: [] } // No error, just use default
    }

    return { value: numValue, errors: [] }
  }

  /**
   * Extract city, state, zip from address string
   */
  private extractLocationFromAddress(address: string): {
    city: string | null
    state: string | null
    zipCode: string | null
  } {
    const result = { city: null, state: null, zipCode: null }

    if (!address) return result

    // Pattern: "123 Main St, City, ST 12345"
    const addressPattern = /,\s*([^,]+),\s*([A-Z]{2})\s+(\d{5})/
    const match = address.match(addressPattern)

    if (match) {
      result.city = match[1].trim()
      result.state = match[2].trim()
      result.zipCode = match[3].trim()
    }

    return result
  }

  /**
   * Generate simple hash for deduplication
   */
  private generateHash(property: RawPropertyData): string {
    const key = `${property.address}_${property.city}_${property.state}_${property.zip_code}_${property.price}`
    return require('crypto')
      .createHash('md5')
      .update(key.toLowerCase())
      .digest('hex')
  }
}
