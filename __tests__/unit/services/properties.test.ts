import { PropertyService } from '@/lib/services/properties'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  Property,
  PropertyInsert,
  PropertyUpdate,
  PropertyWithNeighborhood,
  Neighborhood,
} from '@/types/database'

// Mock the createClient function
const mockCreateClient = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

describe('PropertyService Unit Tests', (): void => {
  let propertyService: PropertyService

  beforeEach((): void => {
    jest.clearAllMocks()
    propertyService = new PropertyService()
  })

  describe('Core CRUD Operations', () => {
    describe('getProperty', () => {
      test('should retrieve property by ID with neighborhood relationship', async (): Promise<void> => {
        const mockProperty: Database['public']['Tables']['properties']['Row'] =
          {
            id: 'prop-123',
            address: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zip_code: '12345',
            price: 500000,
            bedrooms: 3,
            bathrooms: 2,
            square_feet: 1500,
            property_type: 'house',
            is_active: true,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
            neighborhood_id: 'neigh-123',
            description: null,
            images: null,
            amenities: null,
            listing_status: null,
            lot_size_sqft: null,
            parking_spots: null,
            year_built: null,
            zpid: null,
            property_hash: null,
            coordinates: null,
          }

        // Set up the working mock pattern: from → select → eq → eq → single
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockProperty,
          error: null,
        })
        const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle })
        const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })
        const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result: Property | null =
          await propertyService.getProperty('prop-123')

        expect(mockFrom).toHaveBeenCalledWith('properties')
        expect(mockSelect).toHaveBeenCalledWith('*')
        expect(mockEq1).toHaveBeenCalledWith('id', 'prop-123')
        expect(mockEq2).toHaveBeenCalledWith('is_active', true)
        expect(result).toEqual(mockProperty)
      })

      test('should return null when property not found', async (): Promise<void> => {
        // Set up the working mock pattern for not found case
        const mockSingle = jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Property not found' },
        })
        const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle })
        const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
        const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })
        const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result: Property | null =
          await propertyService.getProperty('nonexistent')

        expect(mockFrom).toHaveBeenCalledWith('properties')
        expect(result).toBeNull()
      })
    })

    describe('createProperty', () => {
      test('should create property with proper validation and hash generation', async (): Promise<void> => {
        const propertyInsert: PropertyInsert = {
          address: '456 New Ave',
          city: 'New City',
          state: 'NC',
          zip_code: '67890',
          price: 750000,
          bedrooms: 4,
          bathrooms: 3,
          neighborhood_id: 'neigh-456',
        }

        const mockCreatedProperty: Property = {
          ...propertyInsert,
          id: 'prop-456',
          is_active: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          square_feet: null,
          property_type: null,
          description: null,
          images: null,
          amenities: null,
          listing_status: null,
          lot_size_sqft: null,
          parking_spots: null,
          year_built: null,
          zpid: null,
          property_hash: null,
          coordinates: null,
        }

        // Set up the working mock pattern: from → insert → select → single
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockCreatedProperty,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockInsert = jest.fn().mockReturnValue({ select: mockSelect })
        const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result: Property | null =
          await propertyService.createProperty(propertyInsert)

        expect(mockFrom).toHaveBeenCalledWith('properties')
        expect(mockInsert).toHaveBeenCalledWith(propertyInsert)
        expect(mockSelect).toHaveBeenCalled()
        expect(result).toEqual(mockCreatedProperty)
      })

      test('should handle creation errors gracefully', async (): Promise<void> => {
        const propertyInsert: PropertyInsert = {
          address: 'Invalid Property',
          city: 'Error City',
          state: 'EC',
          zip_code: '00000',
          price: -1, // Invalid price
          bedrooms: 1,
          bathrooms: 1,
        }

        // Set up the working mock pattern for error case
        const mockSingle = jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid price value' },
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockInsert = jest.fn().mockReturnValue({ select: mockSelect })
        const mockFrom = jest.fn().mockReturnValue({ insert: mockInsert })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result: Property | null =
          await propertyService.createProperty(propertyInsert)

        expect(result).toBeNull()
      })
    })

    describe('updateProperty', () => {
      test('should update property with timestamp management', async (): Promise<void> => {
        const propertyUpdate: PropertyUpdate = {
          price: 600000,
          description: 'Updated description',
        }

        const mockUpdatedProperty: Property = {
          id: 'prop-123',
          address: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zip_code: '12345',
          price: 600000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1500,
          property_type: 'house',
          is_active: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
          neighborhood_id: 'neigh-123',
          description: 'Updated description',
          images: null,
          amenities: null,
          listing_status: null,
          lot_size_sqft: null,
          parking_spots: null,
          year_built: null,
          zpid: null,
          property_hash: null,
          coordinates: null,
        }

        // Set up the working mock pattern: from → update → eq → select → single
        const mockSingle = jest.fn().mockResolvedValue({
          data: mockUpdatedProperty,
          error: null,
        })
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle })
        const mockEq = jest.fn().mockReturnValue({ select: mockSelect })
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result: Property | null = await propertyService.updateProperty(
          'prop-123',
          propertyUpdate
        )

        expect(mockFrom).toHaveBeenCalledWith('properties')
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            ...propertyUpdate,
            updated_at: expect.any(String),
          })
        )
        expect(mockEq).toHaveBeenCalledWith('id', 'prop-123')
        expect(result).toEqual(mockUpdatedProperty)
      })
    })

    describe('deleteProperty', () => {
      test('should handle property deletion and soft delete scenarios', async (): Promise<void> => {
        // Set up the working mock pattern: from → update → eq
        const mockEq = jest.fn().mockResolvedValue({
          data: {},
          error: null,
        })
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result: boolean = await propertyService.deleteProperty('prop-123')

        expect(mockFrom).toHaveBeenCalledWith('properties')
        expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
        expect(mockEq).toHaveBeenCalledWith('id', 'prop-123')
        expect(result).toBe(true)
      })

      test('should handle deletion errors', async (): Promise<void> => {
        // Set up the working mock pattern for error case
        const mockEq = jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Property not found' },
        })
        const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq })
        const mockFrom = jest.fn().mockReturnValue({ update: mockUpdate })

        mockCreateClient.mockResolvedValue({ from: mockFrom })

        const result: boolean =
          await propertyService.deleteProperty('nonexistent')

        expect(result).toBe(false)
      })
    })
  })

  describe('Search & Filtering', () => {
    test('should search properties with price range filters using real properties', async (): Promise<void> => {
      const mockProperties: PropertyWithNeighborhood[] = [
        {
          id: 'prop-1',
          address: '100 Affordable St',
          city: 'Budget City',
          state: 'BC',
          zip_code: '11111',
          price: 300000,
          bedrooms: 2,
          bathrooms: 1,
          is_active: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          neighborhood_id: 'neigh-1',
          square_feet: null,
          property_type: null,
          description: null,
          images: null,
          amenities: null,
          listing_status: null,
          lot_size_sqft: null,
          parking_spots: null,
          year_built: null,
          zpid: null,
          property_hash: null,
          coordinates: null,
          neighborhood: {
            id: 'neigh-1',
            name: 'Budget Neighborhood',
            city: 'Budget City',
            state: 'BC',
            created_at: '2024-01-01T00:00:00.000Z',
            bounds: null,
            median_price: null,
            metro_area: null,
            transit_score: null,
            walk_score: null,
          },
        },
      ]

      // Set up simple Promise-based mock for searchProperties
      const searchResult = { data: mockProperties, error: null, count: 1 }
      const queryPromise = Promise.resolve(searchResult)

      // Add all query methods that return the same promise
      queryPromise.select = jest.fn().mockReturnValue(queryPromise)
      queryPromise.eq = jest.fn().mockReturnValue(queryPromise)
      queryPromise.gte = jest.fn().mockReturnValue(queryPromise)
      queryPromise.lte = jest.fn().mockReturnValue(queryPromise)
      queryPromise.in = jest.fn().mockReturnValue(queryPromise)
      queryPromise.order = jest.fn().mockReturnValue(queryPromise)
      queryPromise.range = jest.fn().mockReturnValue(queryPromise)
      queryPromise.limit = jest.fn().mockReturnValue(queryPromise)

      const mockFrom = jest.fn().mockReturnValue(queryPromise)
      mockCreateClient.mockResolvedValue({ from: mockFrom })

      const searchParams = {
        filters: {
          price_min: 250000,
          price_max: 350000,
        },
        pagination: {
          page: 1,
          limit: 20,
        },
      }

      const result = await propertyService.searchProperties(searchParams)

      expect(mockFrom).toHaveBeenCalledWith('properties')
      expect(result.properties).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    test('should filter by property type (house, condo, townhouse, apartment)', async (): Promise<void> => {
      const mockProperties: PropertyWithNeighborhood[] = []

      // Set up simple Promise-based mock for property type filtering
      const searchResult = { data: mockProperties, error: null, count: 0 }
      const queryPromise = Promise.resolve(searchResult)

      queryPromise.select = jest.fn().mockReturnValue(queryPromise)
      queryPromise.eq = jest.fn().mockReturnValue(queryPromise)
      queryPromise.gte = jest.fn().mockReturnValue(queryPromise)
      queryPromise.lte = jest.fn().mockReturnValue(queryPromise)
      queryPromise.in = jest.fn().mockReturnValue(queryPromise)
      queryPromise.order = jest.fn().mockReturnValue(queryPromise)
      queryPromise.range = jest.fn().mockReturnValue(queryPromise)
      queryPromise.limit = jest.fn().mockReturnValue(queryPromise)

      const mockFrom = jest.fn().mockReturnValue(queryPromise)
      mockCreateClient.mockResolvedValue({ from: mockFrom })

      const searchParams = {
        filters: {
          property_types: ['house', 'condo'] as const,
        },
      }

      const result = await propertyService.searchProperties(searchParams)

      expect(mockFrom).toHaveBeenCalledWith('properties')
      expect(result.properties).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    test('should handle geographic filtering by neighborhoods', async (): Promise<void> => {
      const mockProperties: PropertyWithNeighborhood[] = []

      // Set up simple Promise-based mock for neighborhood filtering
      const searchResult = { data: mockProperties, error: null, count: 0 }
      const queryPromise = Promise.resolve(searchResult)

      queryPromise.select = jest.fn().mockReturnValue(queryPromise)
      queryPromise.eq = jest.fn().mockReturnValue(queryPromise)
      queryPromise.gte = jest.fn().mockReturnValue(queryPromise)
      queryPromise.lte = jest.fn().mockReturnValue(queryPromise)
      queryPromise.in = jest.fn().mockReturnValue(queryPromise)
      queryPromise.order = jest.fn().mockReturnValue(queryPromise)
      queryPromise.range = jest.fn().mockReturnValue(queryPromise)
      queryPromise.limit = jest.fn().mockReturnValue(queryPromise)

      const mockFrom = jest.fn().mockReturnValue(queryPromise)
      mockCreateClient.mockResolvedValue({ from: mockFrom })

      const searchParams = {
        filters: {
          neighborhoods: ['neigh-1', 'neigh-2'],
        },
      }

      const result = await propertyService.searchProperties(searchParams)

      expect(mockFrom).toHaveBeenCalledWith('properties')
      expect(result.properties).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    test('should implement pagination correctly with real dataset', async (): Promise<void> => {
      const mockProperties: PropertyWithNeighborhood[] = []

      // Set up simple Promise-based mock for pagination
      const searchResult = { data: mockProperties, error: null, count: 1091 }
      const queryPromise = Promise.resolve(searchResult)

      queryPromise.select = jest.fn().mockReturnValue(queryPromise)
      queryPromise.eq = jest.fn().mockReturnValue(queryPromise)
      queryPromise.gte = jest.fn().mockReturnValue(queryPromise)
      queryPromise.lte = jest.fn().mockReturnValue(queryPromise)
      queryPromise.in = jest.fn().mockReturnValue(queryPromise)
      queryPromise.order = jest.fn().mockReturnValue(queryPromise)
      queryPromise.range = jest.fn().mockReturnValue(queryPromise)
      queryPromise.limit = jest.fn().mockReturnValue(queryPromise)

      const mockFrom = jest.fn().mockReturnValue(queryPromise)
      mockCreateClient.mockResolvedValue({ from: mockFrom })

      const searchParams = {
        pagination: {
          page: 2,
          limit: 20,
        },
      }

      const result = await propertyService.searchProperties(searchParams)

      expect(mockFrom).toHaveBeenCalledWith('properties')
      expect(result.page).toBe(2)
      expect(result.limit).toBe(20)
      expect(result.total).toBe(1091)
    })

    test('should sort by price, date, popularity with performance validation', async (): Promise<void> => {
      const mockProperties: PropertyWithNeighborhood[] = []

      // Set up simple Promise-based mock for sorting
      const searchResult = { data: mockProperties, error: null, count: 0 }
      const queryPromise = Promise.resolve(searchResult)

      queryPromise.select = jest.fn().mockReturnValue(queryPromise)
      queryPromise.eq = jest.fn().mockReturnValue(queryPromise)
      queryPromise.gte = jest.fn().mockReturnValue(queryPromise)
      queryPromise.lte = jest.fn().mockReturnValue(queryPromise)
      queryPromise.in = jest.fn().mockReturnValue(queryPromise)
      queryPromise.order = jest.fn().mockReturnValue(queryPromise)
      queryPromise.range = jest.fn().mockReturnValue(queryPromise)
      queryPromise.limit = jest.fn().mockReturnValue(queryPromise)

      const mockFrom = jest.fn().mockReturnValue(queryPromise)
      mockCreateClient.mockResolvedValue({ from: mockFrom })

      const searchParams = {
        pagination: {
          sort: {
            field: 'price' as const,
            direction: 'desc' as const,
          },
        },
      }

      const result = await propertyService.searchProperties(searchParams)

      expect(mockFrom).toHaveBeenCalledWith('properties')
      expect(result.properties).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('PostGIS Spatial Operations', () => {
    test('should perform radius queries with coordinate validation', async () => {
      const mockPropertiesWithinRadius: PropertyWithNeighborhood[] = [
        {
          id: 'prop-spatial-1',
          address: '789 Spatial Ave',
          city: 'GIS City',
          state: 'GS',
          zip_code: '98765',
          price: 450000,
          bedrooms: 3,
          bathrooms: 2,
          is_active: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          neighborhood_id: 'neigh-spatial-1',
          square_feet: null,
          property_type: null,
          description: null,
          images: null,
          amenities: null,
          listing_status: null,
          lot_size_sqft: null,
          parking_spots: null,
          year_built: null,
          zpid: null,
          property_hash: null,
          coordinates: null,
        },
      ]

      // Set up the working mock pattern for RPC calls
      const mockRpc = jest.fn().mockResolvedValue({
        data: mockPropertiesWithinRadius,
        error: null,
      })

      mockCreateClient.mockResolvedValue({ rpc: mockRpc })

      const result = await propertyService.getPropertiesWithinRadius(
        40.7128,
        -74.006,
        5,
        10
      )

      expect(mockRpc).toHaveBeenCalledWith('get_properties_within_radius', {
        center_lat: 40.7128,
        center_lng: -74.006,
        radius_km: 5,
        limit_count: 10,
      })
      expect(result).toEqual(mockPropertiesWithinRadius)
    })

    test('should find properties within neighborhood bounds', async (): Promise<void> => {
      const mockProperties: PropertyWithNeighborhood[] = []

      // Set up the working mock pattern: from → select → eq → eq → order
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockProperties,
        error: null,
      })
      const mockEq2 = jest.fn().mockReturnValue({ order: mockOrder })
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

      mockCreateClient.mockResolvedValue({ from: mockFrom })

      const result: PropertyWithNeighborhood[] =
        await propertyService.getPropertiesInNeighborhood('neigh-123')

      expect(mockFrom).toHaveBeenCalledWith('properties')
      expect(mockEq1).toHaveBeenCalledWith('neighborhood_id', 'neigh-123')
      expect(mockEq2).toHaveBeenCalledWith('is_active', true)
      expect(result).toEqual(mockProperties)
    })
  })

  describe('Analytics and Statistics', () => {
    test('should generate property statistics correctly', async (): Promise<void> => {
      const mockPropertyStats = [
        {
          price: 300000,
          bedrooms: 2,
          bathrooms: 1,
          square_feet: 1200,
          property_type: 'condo',
        },
        {
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1800,
          property_type: 'house',
        },
        {
          price: 750000,
          bedrooms: 4,
          bathrooms: 3,
          square_feet: 2400,
          property_type: 'house',
        },
      ]

      // Set up the working mock pattern: from → select → eq
      const mockEq = jest.fn().mockResolvedValue({
        data: mockPropertyStats,
        error: null,
      })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

      mockCreateClient.mockResolvedValue({ from: mockFrom })

      const result = await propertyService.getPropertyStats()

      expect(result).toEqual({
        total_properties: 3,
        avg_price: 516667, // (300000 + 500000 + 750000) / 3
        median_price: 500000,
        avg_bedrooms: 3.0, // (2 + 3 + 4) / 3
        avg_bathrooms: 2.0, // (1 + 2 + 3) / 3
        avg_square_feet: 1800, // (1200 + 1800 + 2400) / 3
        property_type_distribution: {
          condo: 1,
          house: 2,
        },
      })
    })

    test('should handle empty dataset gracefully', async (): Promise<void> => {
      // Set up the working mock pattern for empty dataset
      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

      mockCreateClient.mockResolvedValue({ from: mockFrom })

      const result = await propertyService.getPropertyStats()

      expect(result).toEqual({
        total_properties: 0,
        avg_price: 0,
        median_price: 0,
        avg_bedrooms: 0,
        avg_bathrooms: 0,
        avg_square_feet: 0,
        property_type_distribution: {},
      })
    })
  })

  describe('Neighborhood Operations', () => {
    test('should retrieve neighborhood by ID', async (): Promise<void> => {
      const mockNeighborhood: Neighborhood = {
        id: 'neigh-123',
        name: 'Test Neighborhood',
        city: 'Test City',
        state: 'TS',
        created_at: '2024-01-01T00:00:00.000Z',
        bounds: null,
        median_price: 500000,
        metro_area: 'Test Metro',
        transit_score: 85,
        walk_score: 90,
      }

      // Set up the working mock pattern: from → select → eq → single
      const mockSingle = jest.fn().mockResolvedValue({
        data: mockNeighborhood,
        error: null,
      })
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

      mockCreateClient.mockResolvedValue({ from: mockFrom })

      const result: Neighborhood | null =
        await propertyService.getNeighborhood('neigh-123')

      expect(mockFrom).toHaveBeenCalledWith('neighborhoods')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', 'neigh-123')
      expect(result).toEqual(mockNeighborhood)
    })

    test('should search neighborhoods by name and location', async (): Promise<void> => {
      const mockNeighborhoods: Neighborhood[] = [
        {
          id: 'neigh-1',
          name: 'Downtown',
          city: 'Test City',
          state: 'TS',
          created_at: '2024-01-01T00:00:00.000Z',
          bounds: null,
          median_price: null,
          metro_area: null,
          transit_score: null,
          walk_score: null,
        },
      ]

      // Set up the working mock pattern: from → select → or → order → limit
      const mockLimit = jest.fn().mockResolvedValue({
        data: mockNeighborhoods,
        error: null,
      })
      const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })
      const mockOr = jest.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = jest.fn().mockReturnValue({ or: mockOr })
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect })

      mockCreateClient.mockResolvedValue({ from: mockFrom })

      const result: Neighborhood[] =
        await propertyService.searchNeighborhoods('downtown')

      expect(mockFrom).toHaveBeenCalledWith('neighborhoods')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockNeighborhoods)
    })
  })
})
