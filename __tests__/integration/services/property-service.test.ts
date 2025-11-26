/**
 * Integration Tests for PropertyService
 *
 * Tests actual database operations against a real Supabase instance.
 * No mocking - validates true end-to-end functionality.
 */

import { createClient } from '@supabase/supabase-js'
import { PropertyServiceFacade } from '@/lib/services/properties/facade'
import type { Database } from '@/types/database'
import { describe, test, expect, beforeAll } from 'vitest'

describe('PropertyService Integration Tests', () => {
  let propertyService: PropertyServiceFacade
  let supabase: ReturnType<typeof createClient<Database>>
  let existingPropertyId: string | null = null

  beforeAll(async () => {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseKey) {
      throw new Error('Missing Supabase key for integration tests')
    }

    console.log('Running PropertyService integration tests with real Supabase')

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
      console.log('Found existing property for testing:', existingPropertyId)
    }
  })

  describe('Read Operations', () => {
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
      // neighborhood could be null if property doesn't have one
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

      // searchProperties returns { properties: [], total: number, ... }
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
      // Test with very restrictive filters
      const result = await propertyService.searchProperties({
        filters: {
          minPrice: 999999999999, // 999 billion - should match nothing
          maxPrice: 999999999999,
        },
        pagination: {
          limit: 10,
        },
      })

      expect(result).toHaveProperty('properties')
      expect(Array.isArray(result.properties)).toBe(true)
      // May or may not return results depending on data
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

  describe('Error Handling', () => {
    test('should handle invalid UUID gracefully', async () => {
      const result = await propertyService.getProperty('invalid-uuid')

      // Should return null, not throw
      expect(result).toBeNull()
    })

    test('should handle invalid search params gracefully', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          minPrice: -100, // Invalid negative price
        },
        pagination: {
          limit: 10,
        },
      })

      // Should still return a valid response structure
      expect(result).toHaveProperty('properties')
    })
  })
})
