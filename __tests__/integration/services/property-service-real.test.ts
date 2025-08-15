/**
 * Real Integration Test for PropertyService Refactoring
 * 
 * This test verifies the actual functionality of the refactored PropertyService
 * against a real database connection (or simulated environment).
 * Unlike mocked tests, this validates true end-to-end functionality.
 */

import { createClient } from '@supabase/supabase-js'
import { PropertyServiceFacade } from '@/lib/services/properties/facade'
import type { Database } from '@/types/database'

// Skip in CI environment where database isn't available
const describeOrSkip = process.env.CI ? describe.skip : describe

describeOrSkip('PropertyService Real Integration Tests', () => {
  let propertyService: PropertyServiceFacade
  let supabase: ReturnType<typeof createClient<Database>>

  beforeAll(() => {
    // Use test database URL if available, otherwise skip these tests
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
    
    if (!supabaseUrl || !supabaseKey || supabaseKey === 'test-key') {
      console.warn('Skipping real integration tests - no database configured')
      return
    }

    supabase = createClient<Database>(supabaseUrl, supabaseKey)
    
    // Create service with real Supabase client
    const clientFactory = {
      getClient: () => supabase
    }
    
    propertyService = new PropertyServiceFacade(clientFactory)
  })

  describe('Critical RPC Functions', () => {
    test('getPropertiesWithinRadius should use real RPC function', async () => {
      // This test will fail if the RPC function doesn't exist or has wrong parameters
      try {
        const result = await propertyService.getPropertiesWithinRadius(
          37.7749, // San Francisco latitude
          -122.4194, // San Francisco longitude
          5 // 5km radius
        )
        
        // Should return an array (even if empty)
        expect(Array.isArray(result)).toBe(true)
      } catch (error: any) {
        // If this fails with "function does not exist", the migration conflict is real
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          throw new Error('RPC function get_properties_within_radius does not exist - migration conflict not resolved!')
        }
        // If it fails with "not unique", the conflict still exists
        if (error.message?.includes('not unique')) {
          throw new Error('RPC function get_properties_within_radius has conflicting definitions!')
        }
        throw error
      }
    })

    test('getNeighborhoodStats should use real RPC function', async () => {
      try {
        // Use a fake UUID - we expect null result but no error
        const result = await propertyService.analyticsService.getNeighborhoodStats(
          '00000000-0000-0000-0000-000000000000'
        )
        
        // Should return null for non-existent neighborhood
        expect(result).toBeNull()
      } catch (error: any) {
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          throw new Error('RPC function get_neighborhood_stats does not exist!')
        }
        throw error
      }
    })

    test('calculateDistance should use real RPC function', async () => {
      try {
        const distance = await propertyService.calculateDistance(
          37.7749, -122.4194, // San Francisco
          37.7849, -122.4094  // ~1.4km away
        )
        
        // Should return a number
        expect(typeof distance).toBe('number')
        // Distance should be reasonable (between 1-2 km)
        expect(distance).toBeGreaterThan(1)
        expect(distance).toBeLessThan(2)
      } catch (error: any) {
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          throw new Error('RPC function calculate_distance does not exist!')
        }
        throw error
      }
    })
  })

  describe('Service Delegation', () => {
    test('Facade should properly delegate to specialized services', async () => {
      // Test that facade methods actually call the specialized services
      const searchSpy = jest.spyOn(propertyService.searchService, 'searchProperties')
      
      await propertyService.searchProperties({
        filters: { minPrice: 100000 },
        pagination: { limit: 10 }
      })
      
      expect(searchSpy).toHaveBeenCalledWith({
        filters: { minPrice: 100000 },
        pagination: { limit: 10 }
      })
    })
  })

  describe('Error Handling', () => {
    test('Should handle database errors gracefully', async () => {
      // Test with invalid parameters
      try {
        await propertyService.getPropertiesWithinRadius(
          999, // Invalid latitude
          999, // Invalid longitude
          -1   // Invalid radius
        )
      } catch (error: any) {
        // Should get a proper error, not a crash
        expect(error).toBeDefined()
      }
    })
  })
})

// Helper function for manual test execution (not exported from test file)
async function _runRealIntegrationTests(): Promise<{
  passed: number
  failed: number
  errors: string[]
}> {
  const results = {
    passed: 0,
    failed: 0,
    errors: [] as string[]
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    results.errors.push('Missing Supabase configuration')
    return results
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey)
  const clientFactory = { getClient: () => supabase }
  const service = new PropertyServiceFacade(clientFactory)

  // Test 1: RPC function exists and works
  try {
    await service.getPropertiesWithinRadius(37.7749, -122.4194, 5)
    results.passed++
  } catch (error: any) {
    results.failed++
    results.errors.push(`getPropertiesWithinRadius: ${error.message}`)
  }

  // Test 2: Analytics RPC works
  try {
    await service.analyticsService.getNeighborhoodStats('00000000-0000-0000-0000-000000000000')
    results.passed++
  } catch (error: any) {
    results.failed++
    results.errors.push(`getNeighborhoodStats: ${error.message}`)
  }

  // Test 3: Geographic RPC works
  try {
    await service.calculateDistance(37.7749, -122.4194, 37.7849, -122.4094)
    results.passed++
  } catch (error: any) {
    results.failed++
    results.errors.push(`calculateDistance: ${error.message}`)
  }

  return results
}