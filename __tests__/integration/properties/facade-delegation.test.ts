import { jest, describe, beforeEach, test, expect } from '@jest/globals'
import { PropertyServiceFacade } from '@/lib/services/properties/facade'
import { PropertyAnalyticsService } from '@/lib/services/properties/analytics'
import { GeographicService } from '@/lib/services/properties/geographic'
import * as _supabaseClient from '@/lib/supabase/client'
import * as _supabaseServer from '@/lib/supabase/server'

// Supabase client/server modules are already mocked centrally in setupSupabaseMock.ts

// Mock the specialized services
jest.mock('@/lib/services/properties/analytics')
jest.mock('@/lib/services/properties/geographic')

describe('PropertyServiceFacade Delegation Tests', () => {
  let propertyService: PropertyServiceFacade
  let mockSupabaseClient: any
  let mockAnalyticsService: jest.Mocked<PropertyAnalyticsService>
  let mockGeographicService: jest.Mocked<GeographicService>

  beforeEach(() => {
    // Create a fresh mock client for each test with proper chaining
    const createChainableMock = () => {
      const mock = {
        rpc: jest.fn(),
        from: jest.fn(),
        select: jest.fn(),
        eq: jest.fn(),
        single: jest.fn(),
      }
      
      // Make all methods return the mock itself for chaining
      mock.from.mockReturnValue(mock)
      mock.select.mockReturnValue(mock)
      mock.eq.mockReturnValue(mock)
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

    // Create the property service facade
    propertyService = new PropertyServiceFacade()

    // Get the mocked service instances
    mockAnalyticsService = propertyService.analyticsService as jest.Mocked<PropertyAnalyticsService>
    mockGeographicService = propertyService.geographicService as jest.Mocked<GeographicService>
  })

  describe('Analytics Service Delegation', () => {
    test('should delegate getPropertyStats to analyticsService', async () => {
      const mockStats = {
        total_properties: 100,
        avg_price: 500000,
        median_price: 450000,
        avg_bedrooms: 3.2,
        avg_bathrooms: 2.1,
        avg_square_feet: 1600,
        property_type_distribution: { 'single_family': 80, 'condo': 20 }
      }

      mockAnalyticsService.getPropertyStats = jest.fn().mockResolvedValue(mockStats)

      const result = await propertyService.getPropertyStats()

      expect(mockAnalyticsService.getPropertyStats).toHaveBeenCalledTimes(1)
      expect(mockAnalyticsService.getPropertyStats).toHaveBeenCalledWith()
      expect(result).toEqual(mockStats)
    })

    test('should delegate getAdvancedPropertyStats to analyticsService', async () => {
      const mockStats = {
        total_properties: 100,
        avg_price: 500000,
        median_price: 450000,
        avg_bedrooms: 3.2,
        avg_bathrooms: 2.1,
        avg_square_feet: 1600,
        property_type_distribution: { 'single_family': 80, 'condo': 20 }
      }

      mockAnalyticsService.getPropertyStats = jest.fn().mockResolvedValue(mockStats)

      const result = await propertyService.getAdvancedPropertyStats()

      expect(mockAnalyticsService.getPropertyStats).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockStats)
    })

    test('should delegate getNeighborhoodStats to analyticsService', async () => {
      const neighborhoodId = 'neigh-123'
      const mockStats = {
        neighborhood: {
          id: neighborhoodId,
          name: 'Test Neighborhood',
          city: 'Test City',
          state: 'CA',
          metro_area: null,
          median_price: 500000,
          walk_score: null,
          transit_score: null,
          bounds: null,
          created_at: null
        },
        total_properties: 25,
        avg_price: 550000,
        price_range: { min: 300000, max: 800000 },
        avg_bedrooms: 3.2,
        avg_bathrooms: 2.1
      }

      mockAnalyticsService.getNeighborhoodStats = jest.fn().mockResolvedValue(mockStats)

      const result = await propertyService.getNeighborhoodStats(neighborhoodId)

      expect(mockAnalyticsService.getNeighborhoodStats).toHaveBeenCalledTimes(1)
      expect(mockAnalyticsService.getNeighborhoodStats).toHaveBeenCalledWith(neighborhoodId)
      expect(result).toEqual(mockStats)
    })

    test('should delegate getMarketTrends to analyticsService', async () => {
      const timeframe = 'monthly'
      const mockTrends = [
        { period: '2024-01', avg_price: 500000, total_listings: 100, price_change_percent: 2.5 },
        { period: '2024-02', avg_price: 510000, total_listings: 95, price_change_percent: 2.0 }
      ]

      mockAnalyticsService.getMarketTrends = jest.fn().mockResolvedValue(mockTrends)

      const result = await propertyService.getMarketTrends(timeframe)

      expect(mockAnalyticsService.getMarketTrends).toHaveBeenCalledTimes(1)
      expect(mockAnalyticsService.getMarketTrends).toHaveBeenCalledWith(timeframe)
      expect(result).toEqual(mockTrends)
    })

    test('should delegate analyzePropertyPricing to analyticsService', async () => {
      const propertyId = 'prop-123'
      const mockAnalysis = {
        property_id: propertyId,
        current_price: 550000,
        estimated_value: 560000,
        price_per_sqft: 344,
        market_position: 'at' as const,
        comparable_properties: []
      }

      mockAnalyticsService.analyzePropertyPricing = jest.fn().mockResolvedValue(mockAnalysis)

      const result = await propertyService.analyzePropertyPricing(propertyId)

      expect(mockAnalyticsService.analyzePropertyPricing).toHaveBeenCalledTimes(1)
      expect(mockAnalyticsService.analyzePropertyPricing).toHaveBeenCalledWith(propertyId)
      expect(result).toEqual(mockAnalysis)
    })
  })

  describe('Geographic Service Delegation', () => {
    test('should delegate getPropertiesWithinRadius to geographicService', async () => {
      const lat = 34.0522
      const lng = -118.2437
      const radius = 5
      const mockProperties = [
        { id: 'prop-1', address: '123 Test St', distance_km: 2.5 },
        { id: 'prop-2', address: '456 Test Ave', distance_km: 1.8 }
      ]

      mockGeographicService.getPropertiesWithinRadius = jest.fn().mockResolvedValue(mockProperties)

      const result = await propertyService.getPropertiesWithinRadius(lat, lng, radius)

      expect(mockGeographicService.getPropertiesWithinRadius).toHaveBeenCalledTimes(1)
      expect(mockGeographicService.getPropertiesWithinRadius).toHaveBeenCalledWith(lat, lng, radius)
      expect(result).toEqual(mockProperties)
    })

    test('should delegate getPropertiesInBounds to geographicService', async () => {
      const bounds = {
        northEast: { lat: 34.1, lng: -118.2 },
        southWest: { lat: 34.0, lng: -118.3 }
      }
      const limit = 50
      const mockProperties = [
        { id: 'prop-1', address: '123 Test St' },
        { id: 'prop-2', address: '456 Test Ave' }
      ]

      mockGeographicService.getPropertiesInBounds = jest.fn().mockResolvedValue(mockProperties)

      const result = await propertyService.getPropertiesInBounds(bounds, limit)

      expect(mockGeographicService.getPropertiesInBounds).toHaveBeenCalledTimes(1)
      expect(mockGeographicService.getPropertiesInBounds).toHaveBeenCalledWith(bounds, limit)
      expect(result).toEqual(mockProperties)
    })

    test('should delegate calculateDistance to geographicService', async () => {
      const lat1 = 34.0522
      const lng1 = -118.2437
      const lat2 = 34.1522
      const lng2 = -118.1437
      const expectedDistance = 10.5

      mockGeographicService.calculateDistance = jest.fn().mockResolvedValue(expectedDistance)

      const result = await propertyService.calculateDistance(lat1, lng1, lat2, lng2)

      expect(mockGeographicService.calculateDistance).toHaveBeenCalledTimes(1)
      expect(mockGeographicService.calculateDistance).toHaveBeenCalledWith(lat1, lng1, lat2, lng2)
      expect(result).toBe(expectedDistance)
    })

    test('should delegate getWalkabilityScore to geographicService', async () => {
      const lat = 34.0522
      const lng = -118.2437
      const expectedScore = 85

      mockGeographicService.getWalkabilityScore = jest.fn().mockResolvedValue(expectedScore)

      const result = await propertyService.getWalkabilityScore(lat, lng)

      expect(mockGeographicService.getWalkabilityScore).toHaveBeenCalledTimes(1)
      expect(mockGeographicService.getWalkabilityScore).toHaveBeenCalledWith(lat, lng)
      expect(result).toBe(expectedScore)
    })

    test('should delegate getTransitScore to geographicService', async () => {
      const lat = 34.0522
      const lng = -118.2437
      const expectedScore = 75

      mockGeographicService.getTransitScore = jest.fn().mockResolvedValue(expectedScore)

      const result = await propertyService.getTransitScore(lat, lng)

      expect(mockGeographicService.getTransitScore).toHaveBeenCalledTimes(1)
      expect(mockGeographicService.getTransitScore).toHaveBeenCalledWith(lat, lng)
      expect(result).toBe(expectedScore)
    })

    test('should delegate getPropertiesNearAddress to geographicService', async () => {
      const address = '123 Test Street, LA'
      const radius = 2
      const mockProperties = [{ id: 'prop-1', address: '456 Nearby St' }]

      mockGeographicService.getPropertiesNearAddress = jest.fn().mockResolvedValue(mockProperties)

      const result = await propertyService.getPropertiesNearAddress(address, radius)

      expect(mockGeographicService.getPropertiesNearAddress).toHaveBeenCalledTimes(1)
      expect(mockGeographicService.getPropertiesNearAddress).toHaveBeenCalledWith(address, radius)
      expect(result).toEqual(mockProperties)
    })

    test('should delegate getPropertiesAlongRoute to geographicService', async () => {
      const waypoints = [
        { lat: 34.0522, lng: -118.2437 },
        { lat: 34.0622, lng: -118.2337 }
      ]
      const corridorWidth = 1
      const mockProperties = [{ id: 'prop-1', address: '123 Route St' }]

      mockGeographicService.getPropertiesAlongRoute = jest.fn().mockResolvedValue(mockProperties)

      const result = await propertyService.getPropertiesAlongRoute(waypoints, corridorWidth)

      expect(mockGeographicService.getPropertiesAlongRoute).toHaveBeenCalledTimes(1)
      expect(mockGeographicService.getPropertiesAlongRoute).toHaveBeenCalledWith(waypoints, corridorWidth)
      expect(result).toEqual(mockProperties)
    })

    test('should delegate getGeographicDensity to geographicService', async () => {
      const bounds = {
        northEast: { lat: 34.1, lng: -118.2 },
        southWest: { lat: 34.0, lng: -118.3 }
      }
      const gridSize = 0.01
      const mockDensity = {
        total_properties: 50,
        avg_price: 500000,
        price_density: [
          { lat: 34.05, lng: -118.25, price: 450000, density_score: 75 }
        ]
      }

      mockGeographicService.getGeographicDensity = jest.fn().mockResolvedValue(mockDensity)

      const result = await propertyService.getGeographicDensity(bounds, gridSize)

      expect(mockGeographicService.getGeographicDensity).toHaveBeenCalledTimes(1)
      expect(mockGeographicService.getGeographicDensity).toHaveBeenCalledWith(bounds, gridSize)
      expect(result).toEqual(mockDensity)
    })

    test('should delegate getCommuteAnalysis to geographicService', async () => {
      const propertyId = 'prop-123'
      const destinations = [
        { lat: 34.1, lng: -118.2 },
        { lat: 34.0, lng: -118.3 }
      ]
      const mockCommute = {
        property_id: propertyId,
        destinations: [
          { destination_index: 0, distance_km: 10.5, estimated_time_minutes: 15 }
        ]
      }

      mockGeographicService.getCommuteAnalysis = jest.fn().mockResolvedValue(mockCommute)

      const result = await propertyService.getCommuteAnalysis(propertyId, destinations)

      expect(mockGeographicService.getCommuteAnalysis).toHaveBeenCalledTimes(1)
      expect(mockGeographicService.getCommuteAnalysis).toHaveBeenCalledWith(propertyId, destinations)
      expect(result).toEqual(mockCommute)
    })
  })

  describe('Service Initialization', () => {
    test('should initialize all specialized services', () => {
      expect(propertyService.analyticsService).toBeInstanceOf(PropertyAnalyticsService)
      expect(propertyService.geographicService).toBeInstanceOf(GeographicService)
      expect(propertyService.crudService).toBeDefined()
      expect(propertyService.searchService).toBeDefined()
      expect(propertyService.neighborhoodService).toBeDefined()
    })

    test('should pass client factory to all specialized services', () => {
      const mockClientFactory = jest.fn()
      const serviceWithFactory = new PropertyServiceFacade(mockClientFactory)
      
      // Verify that services were created (constructor would be called with factory)
      expect(serviceWithFactory.analyticsService).toBeDefined()
      expect(serviceWithFactory.geographicService).toBeDefined()
    })
  })

  describe('Error Handling Delegation', () => {
    test('should propagate analytics service errors', async () => {
      const error = new Error('Analytics service error')
      mockAnalyticsService.getPropertyStats = jest.fn().mockRejectedValue(error)

      await expect(propertyService.getPropertyStats()).rejects.toThrow('Analytics service error')
    })

    test('should propagate geographic service errors', async () => {
      const error = new Error('Geographic service error')
      mockGeographicService.getPropertiesWithinRadius = jest.fn().mockRejectedValue(error)

      await expect(
        propertyService.getPropertiesWithinRadius(34.0522, -118.2437, 5)
      ).rejects.toThrow('Geographic service error')
    })

    test('should handle null responses from analytics service', async () => {
      mockAnalyticsService.getNeighborhoodStats = jest.fn().mockResolvedValue(null)

      const result = await propertyService.getNeighborhoodStats('nonexistent')

      expect(result).toBeNull()
      expect(mockAnalyticsService.getNeighborhoodStats).toHaveBeenCalledWith('nonexistent')
    })

    test('should handle null responses from geographic service', async () => {
      mockGeographicService.getCommuteAnalysis = jest.fn().mockResolvedValue(null)

      const result = await propertyService.getCommuteAnalysis('nonexistent', [])

      expect(result).toBeNull()
      expect(mockGeographicService.getCommuteAnalysis).toHaveBeenCalledWith('nonexistent', [])
    })
  })
})