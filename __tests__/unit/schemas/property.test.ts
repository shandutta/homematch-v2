import {
  propertySchema,
  propertyInsertSchema,
  propertyUpdateSchema,
  neighborhoodSchema,
  propertyFiltersSchema,
  propertySearchSchema,
  coordinatesSchema,
  boundingBoxSchema,
} from '@/lib/schemas/property'

describe('Property Schema Validation', () => {
  describe('propertySchema', () => {
    test('should validate valid property data passes all checks', () => {
      const validProperty = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        zpid: 'zpid_123456',
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94102',
        price: 850000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1500,
        property_type: 'house',
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ],
        description: 'Beautiful house in downtown SF',
        coordinates: { type: 'Point', coordinates: [-122.4194, 37.7749] },
        neighborhood_id: '456e7890-e12b-34d5-a678-901234567890',
        amenities: ['garage', 'garden', 'pool'],
        year_built: 1995,
        lot_size_sqft: 5000,
        parking_spots: 2,
        listing_status: 'active',
        property_hash: 'hash_abc123',
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const result = propertySchema.safeParse(validProperty)
      expect(result.success).toBe(true)
    })

    test('should reject invalid property data with clear error messages', () => {
      const invalidProperty = {
        id: 'invalid-uuid',
        address: '', // Empty string should fail
        city: 'SF',
        state: 'CA',
        zip_code: '94102',
        price: -100, // Negative price should fail
        bedrooms: 25, // Too many bedrooms
        bathrooms: 2,
        property_type: 'invalid_type', // Invalid enum value
      }

      const result = propertySchema.safeParse(invalidProperty)
      expect(result.success).toBe(false)

      const errorMessages = result.success
        ? []
        : result.error.issues.map((issue) => issue.message)
      expect(errorMessages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid uuid'),
          expect.stringContaining(
            'String must contain at least 1 character(s)'
          ),
          expect.stringContaining('Number must be greater than or equal to 0'),
          expect.stringContaining('Number must be less than or equal to 20'),
          expect.stringContaining('Invalid enum value'),
        ])
      )
    })

    test('should validate property search filters correctly', () => {
      const validFilters = {
        price_min: 300000,
        price_max: 800000,
        bedrooms_min: 2,
        bedrooms_max: 4,
        bathrooms_min: 1,
        bathrooms_max: 3,
        square_feet_min: 1000,
        square_feet_max: 2500,
        property_types: ['house', 'condo'],
        neighborhoods: ['123e4567-e89b-12d3-a456-426614174000'],
        amenities: ['parking', 'pool'],
        year_built_min: 1990,
        year_built_max: 2020,
        lot_size_min: 2000,
        lot_size_max: 10000,
        parking_spots_min: 1,
        listing_status: ['active', 'pending'],
        within_radius: {
          center: [-122.4194, 37.7749],
          radius_km: 5,
        },
      }

      const result = propertyFiltersSchema.safeParse(validFilters)
      expect(result.success).toBe(true)
    })

    test('should handle coordinate validation and transformation', () => {
      const validCoordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      }

      const result = coordinatesSchema.safeParse(validCoordinates)
      expect(result.success).toBe(true)

      // Test invalid coordinates
      const invalidCoordinates = {
        latitude: 91, // Out of range
        longitude: -181, // Out of range
      }

      const invalidResult = coordinatesSchema.safeParse(invalidCoordinates)
      expect(invalidResult.success).toBe(false)
    })

    test('should validate property type enums and constraints', () => {
      const validPropertyTypes = ['house', 'condo', 'townhouse', 'apartment']

      validPropertyTypes.forEach((type) => {
        const property = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          zpid: null,
          address: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zip_code: '12345',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: null,
          property_type: type,
          images: null,
          description: null,
          coordinates: null,
          neighborhood_id: null,
          amenities: null,
          year_built: null,
          lot_size_sqft: null,
          parking_spots: null,
          listing_status: null,
          property_hash: null,
          is_active: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }

        const result = propertySchema.safeParse(property)
        expect(result.success).toBe(true)
      })

      // Test invalid property type
      const invalidProperty = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        zpid: null,
        address: '123 Test St',
        city: 'Test City',
        state: 'CA',
        zip_code: '12345',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: null,
        property_type: 'mansion', // Invalid type
        images: null,
        description: null,
        coordinates: null,
        neighborhood_id: null,
        amenities: null,
        year_built: null,
        lot_size_sqft: null,
        parking_spots: null,
        listing_status: null,
        property_hash: null,
        is_active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      const invalidResult = propertySchema.safeParse(invalidProperty)
      expect(invalidResult.success).toBe(false)
    })
  })

  describe('propertyInsertSchema', () => {
    test('should validate property creation data', () => {
      const validInsert = {
        address: '456 New Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90210',
        price: 1200000,
        bedrooms: 4,
        bathrooms: 3,
      }

      const result = propertyInsertSchema.safeParse(validInsert)
      expect(result.success).toBe(true)
    })

    test('should reject incomplete required fields', () => {
      const incompleteInsert = {
        address: '456 New Ave',
        // Missing required fields: city, state, zip_code, price, bedrooms, bathrooms
      }

      const result = propertyInsertSchema.safeParse(incompleteInsert)
      expect(result.success).toBe(false)
    })
  })

  describe('propertyUpdateSchema', () => {
    test('should validate partial property updates', () => {
      const validUpdate = {
        price: 900000,
        description: 'Updated description with new features',
        amenities: ['updated_garage', 'new_pool'],
        updated_at: '2024-01-02T00:00:00.000Z',
      }

      const result = propertyUpdateSchema.safeParse(validUpdate)
      expect(result.success).toBe(true)
    })

    test('should allow empty updates', () => {
      const emptyUpdate = {}

      const result = propertyUpdateSchema.safeParse(emptyUpdate)
      expect(result.success).toBe(true)
    })
  })

  describe('neighborhoodSchema', () => {
    test('should validate neighborhood data', () => {
      const validNeighborhood = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Mission District',
        city: 'San Francisco',
        state: 'CA',
        metro_area: 'San Francisco Bay Area',
        bounds: {
          type: 'Polygon',
          coordinates: [
            [
              [-122.423, 37.765],
              [-122.423, 37.755],
              [-122.413, 37.755],
              [-122.413, 37.765],
              [-122.423, 37.765],
            ],
          ],
        },
        median_price: 850000,
        walk_score: 95,
        transit_score: 85,
        created_at: '2024-01-01T00:00:00.000Z',
      }

      const result = neighborhoodSchema.safeParse(validNeighborhood)
      expect(result.success).toBe(true)
    })

    test('should validate walk and transit scores within range', () => {
      const invalidScores = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Neighborhood',
        city: 'Test City',
        state: 'CA',
        walk_score: 150, // Over 100
        transit_score: -10, // Below 0
        created_at: '2024-01-01T00:00:00.000Z',
      }

      const result = neighborhoodSchema.safeParse(invalidScores)
      expect(result.success).toBe(false)
    })
  })

  describe('boundingBoxSchema', () => {
    test('should validate proper bounding box coordinates', () => {
      const validBoundingBox = {
        north: 37.8,
        south: 37.7,
        east: -122.3,
        west: -122.5,
      }

      const result = boundingBoxSchema.safeParse(validBoundingBox)
      expect(result.success).toBe(true)
    })

    test('should reject invalid bounding box relationships', () => {
      const invalidBoundingBox = {
        north: 37.7, // Should be greater than south
        south: 37.8,
        east: -122.5, // Should be greater than west
        west: -122.3,
      }

      const result = boundingBoxSchema.safeParse(invalidBoundingBox)
      expect(result.success).toBe(false)

      const errorMessages = result.success
        ? []
        : result.error.issues.map((issue) => issue.message)
      expect(errorMessages).toEqual(
        expect.arrayContaining([
          'North must be greater than south',
          'East must be greater than west',
        ])
      )
    })
  })

  describe('propertySearchSchema', () => {
    test('should validate complete search request', () => {
      const validSearch = {
        filters: {
          price_min: 500000,
          price_max: 1000000,
          bedrooms_min: 2,
          property_types: ['house', 'condo'],
          neighborhoods: ['123e4567-e89b-12d3-a456-426614174000'],
        },
        pagination: {
          page: 1,
          limit: 20,
          sort: {
            field: 'price',
            direction: 'desc',
          },
        },
      }

      const result = propertySearchSchema.safeParse(validSearch)
      expect(result.success).toBe(true)
    })

    test('should handle empty search (all optional)', () => {
      const emptySearch = {}

      const result = propertySearchSchema.safeParse(emptySearch)
      expect(result.success).toBe(true)
    })

    test('should validate pagination limits', () => {
      const invalidPagination = {
        pagination: {
          page: 0, // Should be minimum 1
          limit: 150, // Should be maximum 100
        },
      }

      const result = propertySearchSchema.safeParse(invalidPagination)
      expect(result.success).toBe(false)
    })
  })
})
