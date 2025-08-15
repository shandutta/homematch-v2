import { jest, describe, beforeEach, test, expect } from '@jest/globals'
import { GeographicService } from '@/lib/services/properties/geographic'
import * as _supabaseClient from '@/lib/supabase/client'
import * as _supabaseServer from '@/lib/supabase/server'
import * as supabaseRpcTypes from '@/lib/services/supabase-rpc-types'
import * as coordinatesUtils from '@/lib/utils/coordinates'

// Mock the entire supabase client/server modules
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('GeographicService', () => {
  let geographicService: GeographicService
  let mockSupabaseClient: any

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

    geographicService = new GeographicService()
  })

  describe('getPropertiesWithinRadius', () => {
    test('should return properties within radius successfully', async () => {
      const mockProperties = [
        { id: 'prop-1', address: '123 Test St', distance_km: 2.5 },
        { id: 'prop-2', address: '456 Test Ave', distance_km: 1.8 }
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await geographicService.getPropertiesWithinRadius(34.0522, -118.2437, 5, 10)

      expect(result).toEqual(mockProperties)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_properties_within_radius', {
        center_lat: 34.0522,
        center_lng: -118.2437,
        radius_km: 5,
        result_limit: 10
      })
    })

    test('should handle errors gracefully', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      // Use different coordinates to avoid cache collision
      const result = await geographicService.getPropertiesWithinRadius(34.0600, -118.2500, 3)

      expect(result).toEqual([])
    })

    test('should validate required parameters', async () => {
      await expect(
        geographicService.getPropertiesWithinRadius(null as any, -118.2437, 5)
      ).rejects.toThrow()
    })
  })

  describe('getPropertiesInBounds', () => {
    test('should return properties within bounds successfully', async () => {
      const bounds = {
        northEast: { lat: 34.1, lng: -118.2 },
        southWest: { lat: 34.0, lng: -118.3 }
      }
      const mockProperties = [
        { id: 'prop-1', address: '123 Test St' },
        { id: 'prop-2', address: '456 Test Ave' }
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await geographicService.getPropertiesInBounds(bounds, 50)

      expect(result).toEqual(mockProperties)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_properties_in_bounds', {
        north_lat: 34.1,
        south_lat: 34.0,
        east_lng: -118.2,
        west_lng: -118.3,
        result_limit: 50
      })
    })
  })

  describe('calculateDistance', () => {
    test('should calculate distance between two points', async () => {
      const expectedDistance = 10.5

      mockSupabaseClient.rpc.mockResolvedValue({
        data: expectedDistance,
        error: null,
      })

      const result = await geographicService.calculateDistance(34.0522, -118.2437, 34.1522, -118.1437)

      expect(result).toBe(expectedDistance)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('calculate_distance', {
        lat1: 34.0522,
        lng1: -118.2437,
        lat2: 34.1522,
        lng2: -118.1437
      })
    })

    test('should return null on error', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Calculation error' },
      })

      // Use different coordinates to avoid cache collision
      const result = await geographicService.calculateDistance(34.0700, -118.2600, 34.1700, -118.1600)

      expect(result).toBe(null) // Legacy error handling returns null
    })
  })

  describe('getWalkabilityScore', () => {
    test('should return walkability score', async () => {
      const expectedScore = 85

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: expectedScore,
        error: null,
      })

      const result = await geographicService.getWalkabilityScore(34.0522, -118.2437)

      expect(result).toBe(expectedScore)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_walkability_score', {
        center_lat: 34.0522,
        center_lng: -118.2437
      })
    })

    test('should return null on RPC error', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Score calculation error' },
      })

      // Use different coordinates to avoid cache collision
      const result = await geographicService.getWalkabilityScore(34.0500, -118.2400)

      expect(result).toBe(null) // Legacy error handling returns null
    })
  })

  describe('getTransitScore', () => {
    test('should return transit score', async () => {
      const expectedScore = 75

      mockSupabaseClient.rpc.mockResolvedValue({
        data: expectedScore,
        error: null,
      })

      const result = await geographicService.getTransitScore(34.0522, -118.2437)

      expect(result).toBe(expectedScore)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_transit_score', {
        center_lat: 34.0522,
        center_lng: -118.2437
      })
    })

    test('should return default score on error', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Score calculation error' },
      })

      const result = await geographicService.getTransitScore(34.0522, -118.2437)

      expect(result).toBe(30) // Default fallback
    })
  })

  describe('getPropertiesNearAddress', () => {
    test('should handle geocoding and return nearby properties', async () => {
      const mockGeocode = [{ latitude: 34.0522, longitude: -118.2437, formatted_address: '123 Test St', confidence: 0.9 }]
      const mockProperties = [{ id: 'prop-1', address: '456 Nearby St' }]

      // Mock geocode call first, then properties call
      mockSupabaseClient.rpc
        .mockResolvedValueOnce({ data: mockGeocode, error: null })
        .mockResolvedValueOnce({ data: mockProperties, error: null })

      const result = await geographicService.getPropertiesNearAddress('123 Test Street, LA', 2)

      expect(result).toEqual(mockProperties)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('geocode_address', {
        address_text: '123 Test Street, LA'
      })
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_properties_within_radius', {
        center_lat: 34.0522,
        center_lng: -118.2437,
        radius_km: 2,
        result_limit: 50
      })
    })

    test('should return empty array when geocoding fails', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Geocoding failed' },
      })

      const result = await geographicService.getPropertiesNearAddress('Unknown Address', 2)

      expect(result).toEqual([])
    })
  })

  describe('getPropertiesAlongRoute', () => {
    test('should return properties along route', async () => {
      const waypoints = [
        { lat: 34.0522, lng: -118.2437 },
        { lat: 34.0622, lng: -118.2337 }
      ]
      const mockProperties = [{ id: 'prop-1', address: '123 Route St' }]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await geographicService.getPropertiesAlongRoute(waypoints, 1)

      expect(result).toEqual(mockProperties)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_properties_along_route', {
        waypoints,
        corridor_width_km: 1
      })
    })
  })

  describe('getGeographicDensity', () => {
    test('should return geographic density analysis', async () => {
      const bounds = {
        northEast: { lat: 34.1, lng: -118.2 },
        southWest: { lat: 34.0, lng: -118.3 }
      }
      const mockDensity = {
        total_properties: 50,
        avg_price: 500000,
        price_density: [
          { lat: 34.05, lng: -118.25, price: 450000, density_score: 75 }
        ]
      }

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockDensity,
        error: null,
      })

      const result = await geographicService.getGeographicDensity(bounds, 0.01)

      expect(result).toEqual(mockDensity)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_geographic_density', {
        north_lat: 34.1,
        south_lat: 34.0,
        east_lng: -118.2,
        west_lng: -118.3,
        grid_size_deg: 0.01
      })
    })

    test('should return null on error', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Density calculation error' },
      })

      // Use different bounds to avoid cache collision
      const bounds = {
        northEast: { lat: 34.2, lng: -118.1 },
        southWest: { lat: 34.1, lng: -118.4 }
      }

      const result = await geographicService.getGeographicDensity(bounds, 0.02)

      expect(result).toBe(null) // Legacy error handling returns null
    })
  })

  describe('getPropertiesByDistance', () => {
    test('should return properties sorted by distance', async () => {
      const mockProperties = [
        { id: 'prop-1', address: '123 Close St', distance_km: 1.2 },
        { id: 'prop-2', address: '456 Far St', distance_km: 3.8 }
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await geographicService.getPropertiesByDistance(34.0522, -118.2437, 5, 10)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('property')
      expect(result[0]).toHaveProperty('distance_km', 1.2)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_properties_by_distance', {
        center_lat: 34.0522,
        center_lng: -118.2437,
        max_distance_km: 5,
        result_limit: 10
      })
    })
  })

  describe('getPropertyClusters', () => {
    test('should return property clusters for mapping', async () => {
      const bounds = {
        northEast: { lat: 34.1, lng: -118.2 },
        southWest: { lat: 34.0, lng: -118.3 }
      }
      const mockClusters = [
        { lat: 34.05, lng: -118.25, count: 12, avg_price: 500000, min_price: 400000, max_price: 600000 }
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockClusters,
        error: null,
      })

      const result = await geographicService.getPropertyClusters(bounds, 12)

      expect(result).toEqual(mockClusters)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_property_clusters', {
        north_lat: 34.1,
        south_lat: 34.0,
        east_lng: -118.2,
        west_lng: -118.3,
        zoom_level: 12
      })
    })
  })

  describe('getPropertiesInPolygon', () => {
    test('should return properties within custom polygon', async () => {
      const polygon = [
        { lat: 34.0, lng: -118.3 },
        { lat: 34.1, lng: -118.3 },
        { lat: 34.1, lng: -118.2 },
        { lat: 34.0, lng: -118.2 }
      ]
      const mockProperties = [{ id: 'prop-1', address: '123 Polygon St' }]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await geographicService.getPropertiesInPolygon(polygon, 100)

      expect(result).toEqual(mockProperties)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_properties_in_polygon', {
        polygon_points: polygon,
        result_limit: 100
      })
    })
  })

  describe('getNearestAmenities', () => {
    test('should return empty array when amenities feature not implemented', async () => {
      const amenityTypes = ['restaurant', 'school', 'park']

      // The error is caught by executeArrayQuery and legacy error handler returns []
      const result = await geographicService.getNearestAmenities(34.0522, -118.2437, amenityTypes, 2)
      
      expect(result).toEqual([])
    })

    test('should return empty array on RPC errors', async () => {
      const amenityTypes = ['restaurant']
      
      // Mock isRPCImplemented to return true temporarily
      const mockIsRPCImplemented = jest.spyOn(supabaseRpcTypes, 'isRPCImplemented')
      mockIsRPCImplemented.mockReturnValue(true)

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC function failed' },
      })

      // The error is caught by executeArrayQuery and legacy error handler returns []
      const result = await geographicService.getNearestAmenities(34.0522, -118.2437, amenityTypes, 2)
      
      expect(result).toEqual([])

      // Restore original implementation
      mockIsRPCImplemented.mockRestore()
    })
  })

  describe('getCommuteAnalysis', () => {
    test('should analyze commute to destinations', async () => {
      const destinations = [
        { lat: 34.1, lng: -118.2 },
        { lat: 34.0, lng: -118.3 }
      ]

      // Mock coordinate parsing utility
      const mockParsePostGISGeometry = jest.spyOn(coordinatesUtils, 'parsePostGISGeometry')
      mockParsePostGISGeometry.mockReturnValue({ lat: 34.0522, lng: -118.2437 })

      // Mock property query
      mockSupabaseClient.single.mockResolvedValue({
        data: { coordinates: 'POINT(-118.2437 34.0522)' },
        error: null,
      })

      const result = await geographicService.getCommuteAnalysis('prop-123', destinations)

      expect(result).not.toBeNull()
      expect(result).toHaveProperty('property_id', 'prop-123')
      expect(result).toHaveProperty('destinations')
      expect((result as any).destinations).toHaveLength(2)

      // Restore the mock
      mockParsePostGISGeometry.mockRestore()
    })

    test('should return null for non-existent property', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Property not found' },
      })

      const result = await geographicService.getCommuteAnalysis('nonexistent', [])

      expect(result).toBeNull()
    })

    test('should return null for properties with invalid coordinates', async () => {
      // Mock coordinate parsing utility to return null
      const mockParsePostGISGeometry = jest.spyOn(coordinatesUtils, 'parsePostGISGeometry')
      mockParsePostGISGeometry.mockReturnValue(null)

      // Mock property query
      mockSupabaseClient.single.mockResolvedValue({
        data: { coordinates: 'INVALID_GEOMETRY' },
        error: null,
      })

      // The error is caught by executeQuery and legacy error handler returns null
      const result = await geographicService.getCommuteAnalysis('prop-invalid', [])
      
      expect(result).toBe(null)

      // Restore the mock
      mockParsePostGISGeometry.mockRestore()
    })
  })

  describe('getIsochroneAnalysis', () => {
    test('should generate isochrone analysis', async () => {
      const travelTimes = [15, 30, 45]

      const result = await geographicService.getIsochroneAnalysis(34.0522, -118.2437, travelTimes, 'driving')

      expect(result).not.toBeNull()
      expect(result).toHaveProperty('center_location')
      expect(result).toHaveProperty('transport_mode', 'driving')
      expect(result).toHaveProperty('isochrones')
      expect((result as any).isochrones).toHaveLength(3)
      expect((result as any).method).toBe('circular_approximation')
    })

    test('should handle different transport modes', async () => {
      const result = await geographicService.getIsochroneAnalysis(34.0522, -118.2437, [30], 'walking')

      expect(result).not.toBeNull()
      expect((result as any).transport_mode).toBe('walking')
      expect((result as any).isochrones[0].radius_km).toBeLessThan(5) // Walking should have smaller radius
    })
  })
})