import { jest, describe, beforeEach, test, expect } from '@jest/globals'
import { PropertyAnalyticsService } from '@/lib/services/properties/analytics'
import { GeographicService } from '@/lib/services/properties/geographic'
import { PropertyServiceFacade } from '@/lib/services/properties/facade'
import * as _supabaseClient from '@/lib/supabase/client'
import * as _supabaseServer from '@/lib/supabase/server'

// Supabase client/server modules are already mocked centrally in setupSupabaseMock.ts

describe('Error Handling and Edge Cases Integration Tests', () => {
  let analyticsService: PropertyAnalyticsService
  let geographicService: GeographicService
  let propertyService: PropertyServiceFacade
  let mockSupabaseClient: any

  beforeEach(() => {
    // Create a fresh mock client for each test with proper chaining
    const createChainableMock = () => {
      const mock = {
        rpc: jest.fn(),
        from: jest.fn(),
        select: jest.fn(),
        eq: jest.fn(),
        neq: jest.fn(),
        gte: jest.fn(),
        lte: jest.fn(),
        order: jest.fn(),
        limit: jest.fn(),
        single: jest.fn(),
      }
      
      // Make all methods return the mock itself for chaining
      mock.from.mockReturnValue(mock)
      mock.select.mockReturnValue(mock)
      mock.eq.mockReturnValue(mock)
      mock.neq.mockReturnValue(mock)
      mock.gte.mockReturnValue(mock)
      mock.lte.mockReturnValue(mock)
      mock.order.mockReturnValue(mock)
      mock.limit.mockReturnValue(mock)
      mock.single.mockReturnValue(mock)
      
      return mock
    }
    
    mockSupabaseClient = createChainableMock()

    // Ensure both client and server creators return the same mock
    const { createClient: mockClient } = _supabaseClient as unknown as {
      createClient: jest.Mock
    }
    const { createClient: mockServer } = _supabaseServer as unknown as {
      createClient: jest.Mock
    }
    mockClient.mockReturnValue(mockSupabaseClient)
    mockServer.mockReturnValue(mockSupabaseClient)

    analyticsService = new PropertyAnalyticsService()
    geographicService = new GeographicService()
    propertyService = new PropertyServiceFacade()
  })

  describe('Database Connection Errors', () => {
    test('analyticsService should handle database connection failures', async () => {
      mockSupabaseClient.select.mockRejectedValue(new Error('Connection timeout'))

      await expect(analyticsService.getPropertyStats()).rejects.toThrow()
    })

    test('geographicService should handle RPC connection failures', async () => {
      mockSupabaseClient.rpc.mockRejectedValue(new Error('RPC connection failed'))

      await expect(
        geographicService.getPropertiesWithinRadius(34.0522, -118.2437, 5)
      ).rejects.toThrow()
    })

    test('facade should propagate database connection errors', async () => {
      mockSupabaseClient.select.mockRejectedValue(new Error('Database unavailable'))

      await expect(propertyService.getPropertyStats()).rejects.toThrow()
    })
  })

  describe('Invalid Parameter Handling', () => {
    test('geographicService should validate required latitude parameter', async () => {
      await expect(
        geographicService.getPropertiesWithinRadius(null as any, -118.2437, 5)
      ).rejects.toThrow()
    })

    test('geographicService should validate required longitude parameter', async () => {
      await expect(
        geographicService.getPropertiesWithinRadius(34.0522, null as any, 5)
      ).rejects.toThrow()
    })

    test('geographicService should validate required radius parameter', async () => {
      await expect(
        geographicService.getPropertiesWithinRadius(34.0522, -118.2437, null as any)
      ).rejects.toThrow()
    })

    test('analyticsService should validate required neighborhood ID', async () => {
      await expect(
        analyticsService.getNeighborhoodStats(null as any)
      ).rejects.toThrow()
    })

    test('analyticsService should validate required property ID', async () => {
      await expect(
        analyticsService.analyzePropertyPricing('')
      ).rejects.toThrow()
    })

    test('geographicService should validate required bounds parameter', async () => {
      await expect(
        geographicService.getPropertiesInBounds(null as any)
      ).rejects.toThrow()
    })
  })

  describe('Empty Result Handling', () => {
    test('analyticsService should handle empty property results gracefully', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await analyticsService.getPropertyStats()

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

    test('geographicService should handle empty RPC results gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await geographicService.getPropertiesWithinRadius(34.0522, -118.2437, 5)

      expect(result).toEqual([])
    })

    test('analyticsService should handle missing neighborhood gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Neighborhood not found' },
      })

      const result = await analyticsService.getNeighborhoodStats('nonexistent')

      expect(result).toBeNull()
    })

    test('geographicService should handle geocoding failures gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Geocoding failed' },
      })

      const result = await geographicService.getPropertiesNearAddress('Unknown Address', 2)

      expect(result).toEqual([])
    })
  })

  describe('Malformed Data Handling', () => {
    test('analyticsService should handle properties with null values', async () => {
      const mockProperties = [
        { price: 500000, bedrooms: 3, bathrooms: 2, square_feet: null, property_type: 'single_family' },
        { price: null, bedrooms: 3, bathrooms: 2, square_feet: 1500, property_type: null },
        { price: 600000, bedrooms: null, bathrooms: null, square_feet: 1600, property_type: 'condo' }
      ]

      mockSupabaseClient.select.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await analyticsService.getPropertyStats()

      expect(result.total_properties).toBe(3)
      expect(result.property_type_distribution).toHaveProperty('unknown', 1)
      // Should handle null square_feet gracefully
      expect(result.avg_square_feet).toBeGreaterThan(0)
    })

    test('geographicService should handle invalid coordinate extraction', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { coordinates: 'INVALID_GEOMETRY' },
        error: null,
      })

      const result = await geographicService.getCommuteAnalysis('prop-123', [{ lat: 34.0, lng: -118.0 }])

      // Should still return result with fallback behavior
      expect(result).not.toBeNull()
      expect(result).toHaveProperty('property_id', 'prop-123')
    })

    test('analyticsService should handle edge case price calculations', async () => {
      const mockProperties = [
        { price: 0, bedrooms: 1, bathrooms: 1, square_feet: 500, property_type: 'studio' },
        { price: 1000000000, bedrooms: 10, bathrooms: 8, square_feet: 10000, property_type: 'mansion' }
      ]

      mockSupabaseClient.select.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await analyticsService.getPropertyStats()

      expect(result.total_properties).toBe(2)
      expect(result.avg_price).toBeGreaterThan(0)
      expect(result.median_price).toBeGreaterThan(0)
    })
  })

  describe('RPC Function Availability', () => {
    test('geographicService should handle RPC function not found errors', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'function get_properties_within_radius(lat double precision, lng double precision, radius_km double precision, result_limit integer) does not exist' },
      })

      const result = await geographicService.getPropertiesWithinRadius(34.0522, -118.2437, 5)

      expect(result).toEqual([])
    })

    test('analyticsService should handle missing RPC functions with fallbacks', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'function get_market_trends does not exist' },
      })

      const result = await analyticsService.getMarketTrends('monthly')

      expect(result).toEqual([])
    })

    test('geographicService should provide fallback amenities when RPC fails', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Amenities RPC not available' },
      })

      const result = await geographicService.getNearestAmenities(
        34.0522, -118.2437, ['restaurant', 'school'], 2
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('amenity_type', 'restaurant')
      expect(result[1]).toHaveProperty('amenity_type', 'school')
      expect(result[0]).toHaveProperty('amenity_name', 'Sample restaurant')
    })
  })

  describe('Concurrent Request Handling', () => {
    test('services should handle multiple concurrent requests', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ id: 'prop-1', distance_km: 1.0 }],
        error: null,
      })

      const promises = Array.from({ length: 5 }, (_, i) =>
        geographicService.getPropertiesWithinRadius(34.0522 + i * 0.01, -118.2437, 5)
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toHaveLength(1)
        expect(result[0]).toHaveProperty('id', 'prop-1')
      })
    })

    test('analytics service should handle concurrent pricing analysis', async () => {
      const mockProperty = {
        id: 'prop-123',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1500,
        property_type: 'single_family'
      }

      mockSupabaseClient.single.mockResolvedValue({ data: mockProperty, error: null })
      mockSupabaseClient.limit.mockResolvedValue({ data: [], error: null })

      const promises = Array.from({ length: 3 }, (_, i) =>
        analyticsService.analyzePropertyPricing(`prop-${i}`)
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).not.toBeNull()
        expect(result).toHaveProperty('current_price', 500000)
      })
    })
  })

  describe('Resource Limit Handling', () => {
    test('geographicService should respect result limits', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `prop-${i}`,
        distance_km: Math.random() * 10
      }))

      mockSupabaseClient.rpc.mockResolvedValue({
        data: largeDataset.slice(0, 50), // Simulate limit enforcement
        error: null,
      })

      const result = await geographicService.getPropertiesWithinRadius(34.0522, -118.2437, 5, 50)

      expect(result).toHaveLength(50)
    })

    test('analyticsService should handle large datasets efficiently', async () => {
      const largePropertySet = Array.from({ length: 10000 }, () => ({
        price: 300000 + Math.random() * 500000,
        bedrooms: Math.floor(Math.random() * 5) + 1,
        bathrooms: Math.floor(Math.random() * 4) + 1,
        square_feet: 800 + Math.random() * 2000,
        property_type: ['single_family', 'condo', 'townhome'][Math.floor(Math.random() * 3)]
      }))

      mockSupabaseClient.select.mockResolvedValue({
        data: largePropertySet,
        error: null,
      })

      const result = await analyticsService.getPropertyStats()

      expect(result.total_properties).toBe(10000)
      expect(result.avg_price).toBeGreaterThan(0)
      expect(result.property_type_distribution).toBeDefined()
    })
  })

  describe('Edge Case Coordinates', () => {
    test('geographicService should handle edge case coordinates', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: 0, // Distance at same point
        error: null,
      })

      // Same point distance
      const samePointDistance = await geographicService.calculateDistance(
        34.0522, -118.2437, 34.0522, -118.2437
      )
      expect(samePointDistance).toBe(0)

      // Antipodal points (opposite sides of Earth)
      const antipodal = await geographicService.calculateDistance(
        0, 0, 0, 180
      )
      expect(antipodal).toBe(0) // Mocked, but would be ~20,000km in reality
    })

    test('geographicService should handle extreme search radiuses', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      // Very small radius
      const smallRadius = await geographicService.getPropertiesWithinRadius(
        34.0522, -118.2437, 0.001
      )
      expect(smallRadius).toEqual([])

      // Very large radius
      const largeRadius = await geographicService.getPropertiesWithinRadius(
        34.0522, -118.2437, 1000
      )
      expect(largeRadius).toEqual([])
    })
  })
})