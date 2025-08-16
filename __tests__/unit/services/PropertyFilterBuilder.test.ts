import { describe, test, expect, beforeEach } from '@jest/globals'
import { PropertyFilterBuilder } from '@/lib/services/filters/PropertyFilterBuilder'
import type { PropertyFilters } from '@/lib/schemas/property'

describe('PropertyFilterBuilder', () => {
  let filterBuilder: PropertyFilterBuilder
  let mockQuery: any

  beforeEach(() => {
    filterBuilder = new PropertyFilterBuilder()
    
    // Create a comprehensive mock query object that tracks all applied filters
    mockQuery = {
      appliedFilters: [] as Array<{ method: string; column: string; value: any }>,
      gte: function(column: string, value: any) {
        this.appliedFilters.push({ method: 'gte', column, value })
        return this
      },
      lte: function(column: string, value: any) {
        this.appliedFilters.push({ method: 'lte', column, value })
        return this
      },
      eq: function(column: string, value: any) {
        this.appliedFilters.push({ method: 'eq', column, value })
        return this
      },
      in: function(column: string, value: any[]) {
        this.appliedFilters.push({ method: 'in', column, value })
        return this
      },
      contains: function(column: string, value: any) {
        this.appliedFilters.push({ method: 'contains', column, value })
        return this
      }
    }
  })

  describe('Filter Rule Configuration', () => {
    test('should have all required filter rules configured', () => {
      const rules = filterBuilder.getFilterRules()
      
      expect(rules).toHaveLength(16) // All filter rules from original conditionals
      
      // Verify all expected filter keys are configured
      const filterKeys = rules.map(rule => rule.filterKey)
      expect(filterKeys).toContain('price_min')
      expect(filterKeys).toContain('price_max')
      expect(filterKeys).toContain('bedrooms_min')
      expect(filterKeys).toContain('bedrooms_max')
      expect(filterKeys).toContain('bathrooms_min')
      expect(filterKeys).toContain('bathrooms_max')
      expect(filterKeys).toContain('square_feet_min')
      expect(filterKeys).toContain('square_feet_max')
      expect(filterKeys).toContain('year_built_min')
      expect(filterKeys).toContain('year_built_max')
      expect(filterKeys).toContain('lot_size_min')
      expect(filterKeys).toContain('lot_size_max')
      expect(filterKeys).toContain('parking_spots_min')
      expect(filterKeys).toContain('property_types')
      expect(filterKeys).toContain('neighborhoods')
      expect(filterKeys).toContain('listing_status')
    })

    test('should have correct operations for each filter type', () => {
      const rules = filterBuilder.getFilterRules()
      
      // Range filters should use gte/lte
      const priceMinRule = rules.find(r => r.filterKey === 'price_min')
      expect(priceMinRule?.operation).toBe('gte')
      
      const priceMaxRule = rules.find(r => r.filterKey === 'price_max')
      expect(priceMaxRule?.operation).toBe('lte')
      
      // Array filters should use 'in'
      const propertyTypesRule = rules.find(r => r.filterKey === 'property_types')
      expect(propertyTypesRule?.operation).toBe('in')
      
      const neighborhoodsRule = rules.find(r => r.filterKey === 'neighborhoods')
      expect(neighborhoodsRule?.operation).toBe('in')
    })
  })

  describe('Filter Application', () => {
    test('should apply range filters correctly', () => {
      const filters: PropertyFilters = {
        price_min: 100000,
        price_max: 500000,
        bedrooms_min: 2,
        bathrooms_max: 3
      }

      filterBuilder.applyFilters(mockQuery, filters)

      expect(mockQuery.appliedFilters).toHaveLength(4)
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'gte',
        column: 'price',
        value: 100000
      })
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'lte',
        column: 'price',
        value: 500000
      })
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'gte',
        column: 'bedrooms',
        value: 2
      })
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'lte',
        column: 'bathrooms',
        value: 3
      })
    })

    test('should apply array filters correctly', () => {
      const filters: PropertyFilters = {
        property_types: ['single_family', 'condo'],
        neighborhoods: ['uuid-1', 'uuid-2'],
        listing_status: ['active', 'pending']
      }

      filterBuilder.applyFilters(mockQuery, filters)

      expect(mockQuery.appliedFilters).toHaveLength(3)
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'in',
        column: 'property_type',
        value: ['single_family', 'condo']
      })
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'in',
        column: 'neighborhood_id',
        value: ['uuid-1', 'uuid-2']
      })
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'in',
        column: 'listing_status',
        value: ['active', 'pending']
      })
    })

    test('should apply amenities filter with contains operation', () => {
      const filters: PropertyFilters = {
        amenities: ['pool', 'gym', 'parking']
      }

      filterBuilder.applyFilters(mockQuery, filters)

      // Amenities should generate 3 contains operations (one per amenity)
      expect(mockQuery.appliedFilters).toHaveLength(3)
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'contains',
        column: 'amenities',
        value: ['pool']
      })
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'contains',
        column: 'amenities',
        value: ['gym']
      })
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'contains',
        column: 'amenities',
        value: ['parking']
      })
    })

    test('should skip undefined filter values', () => {
      const filters: PropertyFilters = {
        price_min: 100000,
        price_max: undefined, // Should be skipped
        bedrooms_min: undefined, // Should be skipped
        bathrooms_max: 3
      }

      filterBuilder.applyFilters(mockQuery, filters)

      expect(mockQuery.appliedFilters).toHaveLength(2)
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'gte',
        column: 'price',
        value: 100000
      })
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'lte',
        column: 'bathrooms',
        value: 3
      })
    })

    test('should skip empty arrays', () => {
      const filters: PropertyFilters = {
        property_types: [], // Should be skipped
        neighborhoods: ['uuid-1'], // Should be applied
        amenities: [] // Should be skipped
      }

      filterBuilder.applyFilters(mockQuery, filters)

      expect(mockQuery.appliedFilters).toHaveLength(1)
      expect(mockQuery.appliedFilters).toContainEqual({
        method: 'in',
        column: 'neighborhood_id',
        value: ['uuid-1']
      })
    })

    test('should handle complex filter combination', () => {
      const filters: PropertyFilters = {
        price_min: 200000,
        price_max: 800000,
        bedrooms_min: 3,
        bedrooms_max: 5,
        bathrooms_min: 2,
        square_feet_min: 1500,
        property_types: ['single_family', 'townhome'],
        neighborhoods: ['neighborhood-1'],
        amenities: ['pool'],
        year_built_min: 2000,
        parking_spots_min: 2,
        listing_status: ['active']
      }

      filterBuilder.applyFilters(mockQuery, filters)

      // Should apply all 11 standard filters + 1 amenities contains = 12 operations
      expect(mockQuery.appliedFilters).toHaveLength(12)
    })

    test('should maintain query chainability', () => {
      const filters: PropertyFilters = {
        price_min: 100000
      }

      const result = filterBuilder.applyFilters(mockQuery, filters)

      // Should return the same query object for chaining
      expect(result).toBe(mockQuery)
    })
  })

  describe('Dynamic Filter Management', () => {
    test('should allow adding new filter rules', () => {
      const initialRulesCount = filterBuilder.getFilterRules().length

      filterBuilder.addFilterRule({
        filterKey: 'property_types' as keyof PropertyFilters, // Reusing existing key for simplicity
        column: 'custom_column',
        operation: 'eq'
      })

      expect(filterBuilder.getFilterRules()).toHaveLength(initialRulesCount + 1)
    })

    test('should allow removing filter rules', () => {
      const initialRulesCount = filterBuilder.getFilterRules().length

      filterBuilder.removeFilterRule('price_min')

      const rules = filterBuilder.getFilterRules()
      expect(rules).toHaveLength(initialRulesCount - 1)
      expect(rules.find(r => r.filterKey === 'price_min')).toBeUndefined()
    })
  })

  describe('Backward Compatibility', () => {
    test('should replicate exact behavior of original conditional logic', () => {
      // Test the exact same filter combination that was handled by the original conditionals
      const filters: PropertyFilters = {
        price_min: 100000,
        price_max: 500000,
        bedrooms_min: 2,
        bedrooms_max: 4,
        bathrooms_min: 1,
        bathrooms_max: 3,
        square_feet_min: 1000,
        square_feet_max: 3000,
        property_types: ['single_family', 'condo'],
        neighborhoods: ['uuid-1', 'uuid-2'],
        year_built_min: 1990,
        year_built_max: 2020,
        lot_size_min: 5000,
        lot_size_max: 10000,
        parking_spots_min: 1,
        listing_status: ['active'],
        amenities: ['pool', 'garage']
      }

      filterBuilder.applyFilters(mockQuery, filters)

      // Should generate 16 standard filter operations + 2 amenities contains = 18 total
      expect(mockQuery.appliedFilters).toHaveLength(18)

      // Verify all original conditional filters are applied
      const methods = mockQuery.appliedFilters.map(f => `${f.method}:${f.column}`)
      expect(methods).toContain('gte:price')
      expect(methods).toContain('lte:price')
      expect(methods).toContain('gte:bedrooms')
      expect(methods).toContain('lte:bedrooms')
      expect(methods).toContain('gte:bathrooms')
      expect(methods).toContain('lte:bathrooms')
      expect(methods).toContain('gte:square_feet')
      expect(methods).toContain('lte:square_feet')
      expect(methods).toContain('in:property_type')
      expect(methods).toContain('in:neighborhood_id')
      expect(methods).toContain('gte:year_built')
      expect(methods).toContain('lte:year_built')
      expect(methods).toContain('gte:lot_size_sqft')
      expect(methods).toContain('lte:lot_size_sqft')
      expect(methods).toContain('gte:parking_spots')
      expect(methods).toContain('in:listing_status')
      expect(methods).toContain('contains:amenities')
    })
  })
})