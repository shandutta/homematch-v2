/**
 * Integration Tests for PropertyServiceFacade
 *
 * Consolidated integration tests verifying:
 * 1. Basic CRUD operations (Read, Update)
 * 2. Search functionality (Filters, Pagination)
 * 3. RPC/Database functions (Geolocation, Radius search)
 * 4. Service delegation
 *
 * Tests run against a real Supabase instance (local or remote).
 */

import { createClient } from '@supabase/supabase-js'
import { PropertyServiceFacade } from '@/lib/services/properties/facade'
import type { Database } from '@/types/database'
import { describe, test, expect, beforeAll, vi } from 'vitest'

// Conditional skip for RPC tests if explicitly disabled
const describeRpc =
  process.env.SKIP_RPC_TESTS === 'true' ? describe.skip : describe

describe('PropertyServiceFacade Integration', () => {
  let propertyService: PropertyServiceFacade
  let supabase: ReturnType<typeof createClient<Database>>
  let existingPropertyId: string | null = null

  beforeAll(async () => {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54200'
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseKey) {
      throw new Error('Missing Supabase key for integration tests')
    }

    console.log(
      '🚀 Running PropertyServiceFacade integration tests with real Supabase'
    )

    supabase = createClient<Database>(supabaseUrl, supabaseKey)

    const clientFactory = {
      createClient: async () => supabase,
    }

    propertyService = new PropertyServiceFacade(clientFactory)

    // Find an existing property to test with
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('is_active', true)
      .limit(1)

    if (properties && properties.length > 0) {
      existingPropertyId = properties[0].id
      console.log('✅ Found existing property for testing:', existingPropertyId)
    } else {
      console.warn('⚠️ No active properties found. Some tests may be skipped.')
    }
  })

  describe('Core Operations', () => {
    test('should retrieve a property by ID', async () => {
      if (!existingPropertyId) {
        console.log('Skipping: no existing property found')
        return
      }

      const result = await propertyService.getProperty(existingPropertyId)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(existingPropertyId)
      expect(result?.is_active).toBe(true)
    })

    test('should return null for non-existent property', async () => {
      const result = await propertyService.getProperty(
        '00000000-0000-0000-0000-000000000000'
      )
      expect(result).toBeNull()
    })

    test('should retrieve property with neighborhood data', async () => {
      if (!existingPropertyId) {
        console.log('Skipping: no existing property found')
        return
      }

      const result =
        await propertyService.getPropertyWithNeighborhood(existingPropertyId)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(existingPropertyId)
    })
  })

  describe('Search Operations', () => {
    test('should search properties with filters', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          minPrice: 100000,
          maxPrice: 10000000,
        },
        pagination: {
          limit: 10,
        },
      })

      expect(result).toHaveProperty('properties')
      expect(Array.isArray(result.properties)).toBe(true)
      expect(result).toHaveProperty('total')
    })

    test('should search properties with pagination', async () => {
      const result = await propertyService.searchProperties({
        filters: {},
        pagination: {
          limit: 5,
          page: 1,
        },
      })

      expect(result).toHaveProperty('properties')
      expect(Array.isArray(result.properties)).toBe(true)
      expect(result.properties.length).toBeLessThanOrEqual(5)
    })

    test('should handle restrictive filters', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          minPrice: 999999999999,
          maxPrice: 999999999999,
        },
        pagination: {
          limit: 10,
        },
      })

      expect(result).toHaveProperty('properties')
      expect(Array.isArray(result.properties)).toBe(true)
    })
  })

  describe('Update Operations', () => {
    test('should return null when updating non-existent property', async () => {
      const result = await propertyService.updateProperty(
        '00000000-0000-0000-0000-000000000000',
        { price: 100 }
      )

      expect(result).toBeNull()
    })
  })

  describe('Service Delegation', () => {
    test('Facade should properly delegate to specialized services', async () => {
      const searchSpy = vi.spyOn(
        propertyService.searchService,
        'searchProperties'
      )

      await propertyService.searchProperties({
        filters: { minPrice: 100000 },
        pagination: { limit: 10 },
      })

      expect(searchSpy).toHaveBeenCalledWith({
        filters: { minPrice: 100000 },
        pagination: { limit: 10 },
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid UUID gracefully', async () => {
      const result = await propertyService.getProperty('invalid-uuid')
      expect(result).toBeNull()
    })

    test('should handle invalid search params gracefully', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          minPrice: -100,
        },
        pagination: {
          limit: 10,
        },
      })
      expect(result).toHaveProperty('properties')
    })

    test('Should handle database errors gracefully', async () => {
      try {
        await propertyService.getPropertiesWithinRadius(
          999, // Invalid latitude
          999, // Invalid longitude
          -1 // Invalid radius
        )
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describeRpc('RPC Functions (Geolocation)', () => {
    test('getPropertiesWithinRadius should use real RPC function', async () => {
      try {
        const result = await propertyService.getPropertiesWithinRadius(
          37.7749, // San Francisco latitude
          -122.4194, // San Francisco longitude
          5 // 5km radius
        )
        expect(Array.isArray(result)).toBe(true)
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('function') &&
          error.message.includes('does not exist')
        ) {
          throw new Error(
            'RPC function get_properties_within_radius does not exist - migration conflict not resolved!'
          )
        }
        if (error instanceof Error && error.message.includes('not unique')) {
          throw new Error(
            'RPC function get_properties_within_radius has conflicting definitions!'
          )
        }
        throw error
      }
    })

    test('calculateDistance should use real RPC function', async () => {
      try {
        const distance = await propertyService.calculateDistance(
          37.7749,
          -122.4194, // San Francisco
          37.7849,
          -122.4094 // ~1.4km away
        )

        expect(typeof distance).toBe('number')
        expect(distance).toBeGreaterThan(1)
        expect(distance).toBeLessThan(2)
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('function') &&
          error.message.includes('does not exist')
        ) {
          throw new Error('RPC function calculate_distance does not exist!')
        }
        throw error
      }
    })
  })
})
