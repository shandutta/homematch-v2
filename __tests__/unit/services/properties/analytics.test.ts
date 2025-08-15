import { jest, describe, beforeEach, test, expect } from '@jest/globals'
import { PropertyAnalyticsService } from '@/lib/services/properties/analytics'
import * as _supabaseClient from '@/lib/supabase/client'
import * as _supabaseServer from '@/lib/supabase/server'

// Mock the entire supabase client/server modules
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('PropertyAnalyticsService', () => {
  let analyticsService: PropertyAnalyticsService
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
      
      // Make all methods return the mock itself for chaining, except for terminal methods
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
  })

  describe('getPropertyStats', () => {
    test('should calculate comprehensive property statistics', async () => {
      const mockProperties = [
        { price: 500000, bedrooms: 3, bathrooms: 2, square_feet: 1500, property_type: 'single_family' },
        { price: 700000, bedrooms: 4, bathrooms: 3, square_feet: 2000, property_type: 'single_family' },
        { price: 300000, bedrooms: 2, bathrooms: 1, square_feet: 1000, property_type: 'condo' }
      ]

      // Mock the final call in the chain
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
          'single_family': 2,
          'condo': 1
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

    test('should handle properties with null square_feet', async () => {
      const mockProperties = [
        { price: 500000, bedrooms: 3, bathrooms: 2, square_feet: 1500, property_type: 'single_family' },
        { price: 600000, bedrooms: 3, bathrooms: 2, square_feet: null, property_type: 'single_family' }
      ]

      mockSupabaseClient.eq.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await analyticsService.getPropertyStats()

      expect(result.avg_square_feet).toBe(1500) // Only counts non-null values
      expect(result.total_properties).toBe(2)
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
        property_type_distribution: { 'single_family': 20, 'condo': 5 }
      }

      mockSupabaseClient.rpc.mockResolvedValue({
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
      mockSupabaseClient.rpc.mockResolvedValue({
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
        { period: '2024-01', avg_price: 500000, total_listings: 100, price_change_percent: 2.5 },
        { period: '2024-02', avg_price: 510000, total_listings: 95, price_change_percent: 2.0 },
        { period: '2024-03', avg_price: 520000, total_listings: 102, price_change_percent: 1.96 }
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockTrends,
        error: null,
      })

      const result = await analyticsService.getMarketTrends('monthly')

      expect(result).toEqual(mockTrends)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_market_trends', {
        timeframe: 'monthly',
        months_back: 12
      })
    })

    test('should handle different timeframes', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      await analyticsService.getMarketTrends('weekly')

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_market_trends', {
        timeframe: 'weekly',
        months_back: 3
      })

      await analyticsService.getMarketTrends('quarterly')

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_market_trends', {
        timeframe: 'quarterly',
        months_back: 24
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
        property_type: 'single_family'
      }

      const mockComparables = [
        { id: 'comp-1', price: 520000, bedrooms: 3, bathrooms: 2, square_feet: 1550 },
        { id: 'comp-2', price: 580000, bedrooms: 3, bathrooms: 2, square_feet: 1650 }
      ]

      // Mock property query
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockProperty, error: null })

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

      const result = await analyticsService.analyzePropertyPricing('nonexistent')

      expect(result).toBeNull()
    })

    test('should determine market position correctly', async () => {
      const mockProperty = {
        id: 'prop-123',
        price: 600000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1600,
        property_type: 'single_family'
      }

      const mockComparables = [
        { id: 'comp-1', price: 500000, bedrooms: 3, bathrooms: 2, square_feet: 1550 },
        { id: 'comp-2', price: 520000, bedrooms: 3, bathrooms: 2, square_feet: 1650 }
      ]

      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockProperty, error: null })
      mockSupabaseClient.limit.mockResolvedValue({ data: mockComparables, error: null })

      const result = await analyticsService.analyzePropertyPricing('prop-123')

      expect(result?.market_position).toBe('above') // 600k > 510k * 1.05
    })
  })

  describe('getPropertyTypeDistribution', () => {
    test('should return property type distribution', async () => {
      const mockProperties = [
        { property_type: 'single_family' },
        { property_type: 'single_family' },
        { property_type: 'condo' },
        { property_type: 'townhome' },
        { property_type: null }
      ]

      mockSupabaseClient.eq.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await analyticsService.getPropertyTypeDistribution()

      expect(result).toEqual({
        'single_family': 2,
        'condo': 1,
        'townhome': 1,
        'unknown': 1
      })
    })

    test('should filter by neighborhood when provided', async () => {
      // For this test, the chain ends with .eq() since we filter by neighborhood
      mockSupabaseClient.eq
        .mockReturnValueOnce(mockSupabaseClient) // Return self for the first .eq('is_active', true)
        .mockResolvedValueOnce({                 // Resolve for the second .eq('neighborhood_id', 'neigh-123')
          data: [{ property_type: 'single_family' }],
          error: null,
        })

      await analyticsService.getPropertyTypeDistribution('neigh-123')

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('neighborhood_id', 'neigh-123')
    })
  })

  describe('getPriceHistogram', () => {
    test('should generate price histogram', async () => {
      const mockProperties = [
        { price: 300000 },
        { price: 350000 },
        { price: 400000 },
        { price: 450000 },
        { price: 500000 },
        { price: 600000 },
        { price: 700000 },
        { price: 800000 }
      ]

      mockSupabaseClient.order.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await analyticsService.getPriceHistogram(undefined, 4)

      expect(result).toHaveLength(4)
      expect(result[0]).toHaveProperty('range')
      expect(result[0]).toHaveProperty('count')
      expect(result[0].range).toMatch(/\$\d+k-\$\d+k/)
    })

    test('should return empty array for no properties', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await analyticsService.getPriceHistogram()

      expect(result).toEqual([])
    })
  })

  describe('getTopPerformingProperties', () => {
    test('should return top performing properties by views', async () => {
      const mockProperties = [
        { id: 'prop-1', view_count: 150, price: 500000 },
        { id: 'prop-2', view_count: 120, price: 600000 }
      ]

      mockSupabaseClient.limit.mockResolvedValue({
        data: mockProperties,
        error: null,
      })

      const result = await analyticsService.getTopPerformingProperties('views', 5)

      expect(result).toEqual(mockProperties)
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('view_count', { ascending: false })
      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(5)
    })

    test('should handle different metrics', async () => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null,
      })

      await analyticsService.getTopPerformingProperties('likes')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('like_count', { ascending: false })

      await analyticsService.getTopPerformingProperties('price')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('price', { ascending: false })
    })
  })

  describe('getMarketComparisons', () => {
    test('should return market comparisons', async () => {
      const mockComparisons = [
        { id: 'comp-1', price: 500000, distance_km: 1.2 },
        { id: 'comp-2', price: 520000, distance_km: 0.8 }
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockComparisons,
        error: null,
      })

      const result = await analyticsService.getMarketComparisons('prop-123', 3)

      expect(result).toEqual(mockComparisons)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_property_market_comparisons', {
        target_property_id: 'prop-123',
        radius_km: 3
      })
    })
  })

  describe('getSimilarProperties', () => {
    test('should return similar properties', async () => {
      const mockSimilar = [
        { id: 'sim-1', price: 550000, similarity_score: 85, distance_km: 2.1 },
        { id: 'sim-2', price: 530000, similarity_score: 82, distance_km: 1.5 }
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockSimilar,
        error: null,
      })

      const result = await analyticsService.getSimilarProperties('prop-123', 5, 10)

      expect(result).toEqual(mockSimilar)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_similar_properties', {
        target_property_id: 'prop-123',
        radius_km: 5,
        result_limit: 10
      })
    })
  })

  describe('getMarketVelocity', () => {
    test('should return market velocity metrics', async () => {
      const mockVelocity = {
        avg_days_on_market: 25.5,
        total_sold: 42,
        velocity_score: 75
      }

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockVelocity,
        error: null,
      })

      const result = await analyticsService.getMarketVelocity('neigh-123')

      expect(result).toEqual(mockVelocity)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_market_velocity', {
        target_neighborhood_id: 'neigh-123'
      })
    })

    test('should handle null neighborhood ID', async () => {
      const mockVelocity = {
        avg_days_on_market: 30.0,
        total_sold: 150,
        velocity_score: 65
      }

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockVelocity,
        error: null,
      })

      await analyticsService.getMarketVelocity()

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_market_velocity', {
        target_neighborhood_id: null
      })
    })

    test('should return default values on error', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Velocity calculation error' },
      })

      const result = await analyticsService.getMarketVelocity()

      expect(result).toEqual({
        avg_days_on_market: 0,
        total_sold: 0,
        velocity_score: 0
      })
    })
  })

  describe('getNeighborhoodPriceTrends', () => {
    test('should return neighborhood price trends using market trends', async () => {
      const mockTrends = [
        { period: '2024-01', avg_price: 500000, total_listings: 25, price_change_percent: 2.0 },
        { period: '2024-02', avg_price: 510000, total_listings: 28, price_change_percent: 2.0 }
      ]

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockTrends,
        error: null,
      })

      const result = await analyticsService.getNeighborhoodPriceTrends('neigh-123', 6)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        month: '2024-01',
        avg_price: 500000,
        listing_count: 25
      })
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_market_trends', {
        timeframe: 'monthly',
        months_back: 6
      })
    })

    test('should generate synthetic data when RPC fails', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Market trends not available' },
      })

      const result = await analyticsService.getNeighborhoodPriceTrends('neigh-123', 3)

      expect(result).toHaveLength(3)
      expect(result[0]).toHaveProperty('month')
      expect(result[0]).toHaveProperty('avg_price')
      expect(result[0]).toHaveProperty('listing_count')
      expect(result[0].month).toMatch(/\d{4}-\d{2}/)
      expect(result[0].avg_price).toBeGreaterThan(0)
    })
  })

  describe('getInvestmentAnalysis', () => {
    test('should provide comprehensive investment analysis', async () => {
      const mockProperty = {
        id: 'prop-123',
        price: 500000,
        neighborhood_id: 'neigh-123',
        square_feet: 1500
      }

      const mockVelocity = {
        avg_days_on_market: 25,
        total_sold: 15,
        velocity_score: 75
      }

      // Mock property query
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockProperty, error: null })
      
      // Mock market velocity
      mockSupabaseClient.rpc.mockResolvedValue({ data: mockVelocity, error: null })

      // Mock price analysis by having the analytics service call itself
      const priceAnalysis = {
        property_id: 'prop-123',
        current_price: 500000,
        estimated_value: 510000,
        price_per_sqft: 333,
        market_position: 'at' as const,
        comparable_properties: []
      }

      // Mock the analyzePropertyPricing method
      jest.spyOn(analyticsService, 'analyzePropertyPricing').mockResolvedValue(priceAnalysis)

      const result = await analyticsService.getInvestmentAnalysis('prop-123')

      expect(result).toBeTruthy()
      expect(result).toHaveProperty('property_id', 'prop-123')
      expect(result).toHaveProperty('purchase_price', 500000)
      expect(result).toHaveProperty('rental_analysis')
      expect(result).toHaveProperty('market_metrics')
      expect(result).toHaveProperty('investment_projections')
      expect(result).toHaveProperty('risk_assessment')

      const rental = (result as any).rental_analysis
      expect(rental).toHaveProperty('estimated_monthly_rent')
      expect(rental).toHaveProperty('gross_yield_percent')

      const projections = (result as any).investment_projections
      expect(projections).toHaveProperty('five_year_appreciation')
      expect(projections).toHaveProperty('five_year_total_return_percent')

      const risk = (result as any).risk_assessment
      expect(risk).toHaveProperty('overall_risk_score')
    })

    test('should return null when property not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Property not found' },
      })

      const result = await analyticsService.getInvestmentAnalysis('nonexistent')

      expect(result).toBeNull()
    })

    test('should return null when price analysis fails', async () => {
      const mockProperty = {
        id: 'prop-123',
        price: 500000,
        neighborhood_id: 'neigh-123'
      }

      mockSupabaseClient.single.mockResolvedValue({ data: mockProperty, error: null })
      jest.spyOn(analyticsService, 'analyzePropertyPricing').mockResolvedValue(null)

      const result = await analyticsService.getInvestmentAnalysis('prop-123')

      expect(result).toBeNull()
    })
  })
})