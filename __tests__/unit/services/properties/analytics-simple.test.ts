import { jest, describe, beforeEach, test, expect } from '@jest/globals'
import { PropertyAnalyticsService } from '@/lib/services/properties/analytics'
import { createTypedRPC } from '@/lib/services/supabase-rpc-types'

// Mock the supabase modules
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock the createTypedRPC function
jest.mock('@/lib/services/supabase-rpc-types', () => ({
  createTypedRPC: jest.fn(),
}))

describe('PropertyAnalyticsService - Core Functionality', () => {
  let analyticsService: PropertyAnalyticsService
  let mockSupabaseClient: any
  let mockRPC: any

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(() => mockSupabaseClient),
      select: jest.fn(() => mockSupabaseClient),
      eq: jest.fn(() => mockSupabaseClient),
      neq: jest.fn(() => mockSupabaseClient),
      gte: jest.fn(() => mockSupabaseClient),
      lte: jest.fn(() => mockSupabaseClient),
      order: jest.fn(() => mockSupabaseClient),
      limit: jest.fn(() => mockSupabaseClient),
      single: jest.fn(() => mockSupabaseClient),
      rpc: jest.fn(),
    }

    // Create mock RPC functions
    mockRPC = {
      get_neighborhood_stats: jest.fn(),
      get_market_trends: jest.fn(),
      get_property_market_comparisons: jest.fn(),
      get_market_velocity: jest.fn(),
      get_similar_properties: jest.fn(),
    }

    // Mock the createTypedRPC to return our mock RPC
    ;(createTypedRPC as jest.Mock).mockReturnValue(mockRPC)

    // Mock the createClient functions to return our mock client
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mockClientModule = require('@/lib/supabase/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mockServerModule = require('@/lib/supabase/server')
    mockClientModule.createClient.mockReturnValue(mockSupabaseClient)
    mockServerModule.createClient.mockReturnValue(mockSupabaseClient)

    analyticsService = new PropertyAnalyticsService()
  })

  describe('getPropertyStats', () => {
    test('should calculate comprehensive property statistics', async () => {
      const mockProperties = [
        {
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1500,
          property_type: 'single_family',
        },
        {
          price: 700000,
          bedrooms: 4,
          bathrooms: 3,
          square_feet: 2000,
          property_type: 'single_family',
        },
        {
          price: 300000,
          bedrooms: 2,
          bathrooms: 1,
          square_feet: 1000,
          property_type: 'condo',
        },
      ]

      // Mock the final promise resolution
      mockSupabaseClient.eq.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await analyticsService.getPropertyStats()

      expect(result).toEqual({
        total_properties: 3,
        avg_price: 500000, // (500k + 700k + 300k) / 3
        median_price: 500000, // Middle value when sorted [300k, 500k, 700k]
        avg_bedrooms: 3.0, // (3 + 4 + 2) / 3 = 3.0
        avg_bathrooms: 2.0, // (2 + 3 + 1) / 3 = 2.0
        avg_square_feet: 1500, // (1500 + 2000 + 1000) / 3
        property_type_distribution: {
          single_family: 2,
          condo: 1,
        },
      })
    })

    test('should handle empty properties gracefully', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
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
  })

  describe('getNeighborhoodStats', () => {
    test('should return neighborhood statistics successfully', async () => {
      const mockStats = {
        neighborhood_id: 'neigh-123',
        neighborhood_name: 'Test Neighborhood',
        neighborhood_city: 'Test City',
        neighborhood_state: 'CA',
        total_properties: 25,
        avg_price: 550000,
        median_price: 500000,
        min_price: 300000,
        max_price: 800000,
        avg_bedrooms: 3.2,
        avg_bathrooms: 2.1,
        avg_square_feet: 1650,
      }

      mockRPC.get_neighborhood_stats.mockResolvedValue({
        data: mockStats,
        error: null,
      })

      const result = await analyticsService.getNeighborhoodStats('neigh-123')

      expect(result).toBeTruthy()
      expect(result?.neighborhood.name).toBe('Test Neighborhood')
      expect(result?.total_properties).toBe(25)
      expect(result?.avg_price).toBe(550000)
      expect(result?.price_range).toEqual({ min: 300000, max: 800000 })
    })

    test('should return null for non-existent neighborhood', async () => {
      mockRPC.get_neighborhood_stats.mockResolvedValue({
        data: null,
        error: { message: 'Neighborhood not found' },
      })

      const result = await analyticsService.getNeighborhoodStats('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getMarketTrends', () => {
    test('should return market trends successfully', async () => {
      const mockTrends = [
        {
          period: '2024-01',
          avg_price: 500000,
          total_listings: 100,
          price_change_percent: 2.5,
        },
        {
          period: '2024-02',
          avg_price: 510000,
          total_listings: 95,
          price_change_percent: 2.0,
        },
      ]

      mockRPC.get_market_trends.mockResolvedValue({
        data: mockTrends,
        error: null,
      })

      const result = await analyticsService.getMarketTrends('monthly')

      expect(result).toEqual(mockTrends)
      expect(mockRPC.get_market_trends).toHaveBeenCalledWith({
        timeframe: 'monthly',
        months_back: 12,
      })
    })

    test('should handle different timeframes', async () => {
      mockRPC.get_market_trends.mockResolvedValue({
        data: [],
        error: null,
      })

      await analyticsService.getMarketTrends('weekly')
      expect(mockRPC.get_market_trends).toHaveBeenCalledWith({
        timeframe: 'weekly',
        months_back: 3,
      })

      await analyticsService.getMarketTrends('quarterly')
      expect(mockRPC.get_market_trends).toHaveBeenCalledWith({
        timeframe: 'quarterly',
        months_back: 24,
      })
    })
  })

  describe('getMarketVelocity', () => {
    test('should return market velocity metrics', async () => {
      const mockVelocity = {
        avg_days_on_market: 25.5,
        total_sold: 42,
        velocity_score: 75,
      }

      mockRPC.get_market_velocity.mockResolvedValue({
        data: mockVelocity,
        error: null,
      })

      const result = await analyticsService.getMarketVelocity('neigh-123')

      expect(result).toEqual(mockVelocity)
      expect(mockRPC.get_market_velocity).toHaveBeenCalledWith({
        target_neighborhood_id: 'neigh-123',
      })
    })

    test('should return default values on error', async () => {
      mockRPC.get_market_velocity.mockResolvedValue({
        data: null,
        error: { message: 'Velocity calculation error' },
      })

      const result = await analyticsService.getMarketVelocity()

      expect(result).toEqual({
        avg_days_on_market: 0,
        total_sold: 0,
        velocity_score: 0,
      })
    })
  })

  describe('analyzePropertyPricing', () => {
    test('should analyze property pricing with comparables', async () => {
      const mockProperty = {
        id: 'prop-123',
        price: 550000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1600,
        property_type: 'single_family',
      }

      const mockComparables = [
        {
          id: 'comp-1',
          price: 520000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1550,
        },
        {
          id: 'comp-2',
          price: 580000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1650,
        },
      ]

      // Mock property query
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockProperty,
        error: null,
      })

      // Mock comparables query
      mockSupabaseClient.limit.mockResolvedValue({
        data: mockComparables,
        error: null,
      })

      const result = await analyticsService.analyzePropertyPricing('prop-123')

      expect(result).toBeTruthy()
      expect(result?.property_id).toBe('prop-123')
      expect(result?.current_price).toBe(550000)
      expect(result?.estimated_value).toBe(550000) // Average of comparables
      expect(result?.price_per_sqft).toBe(344) // 550000 / 1600
      expect(result?.market_position).toBe('at')
      expect(result?.comparable_properties).toHaveLength(2)
    })

    test('should return null for non-existent property', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Property not found' },
      })

      const result =
        await analyticsService.analyzePropertyPricing('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('RPC Integration', () => {
    test('should use typed RPC for neighborhood stats', async () => {
      mockRPC.get_neighborhood_stats.mockResolvedValue({
        data: { neighborhood_name: 'Test' },
        error: null,
      })

      await analyticsService.getNeighborhoodStats('test-id')

      expect(createTypedRPC).toHaveBeenCalledWith(mockSupabaseClient)
      expect(mockRPC.get_neighborhood_stats).toHaveBeenCalledWith({
        neighborhood_uuid: 'test-id',
      })
    })

    test('should use typed RPC for market comparisons', async () => {
      mockRPC.get_property_market_comparisons.mockResolvedValue({
        data: [],
        error: null,
      })

      await analyticsService.getMarketComparisons('prop-123', 5)

      expect(mockRPC.get_property_market_comparisons).toHaveBeenCalledWith({
        target_property_id: 'prop-123',
        radius_km: 5,
      })
    })

    test('should use typed RPC for similar properties', async () => {
      mockRPC.get_similar_properties.mockResolvedValue({
        data: [],
        error: null,
      })

      await analyticsService.getSimilarProperties('prop-123', 5, 10)

      expect(mockRPC.get_similar_properties).toHaveBeenCalledWith({
        target_property_id: 'prop-123',
        radius_km: 5,
        result_limit: 10,
      })
    })
  })
})
