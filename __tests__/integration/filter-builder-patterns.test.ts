import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PropertyService } from '@/lib/services/properties'
import { setupTestDatabase, cleanupTestDatabase } from '../fixtures'
import { Property, PropertyInsert } from '@/types/database'

describe('Filter Builder Patterns Integration Tests', () => {
  let propertyService: PropertyService
  let testProperties: Property[] = []
  
  beforeAll(async () => {
    await setupTestDatabase()
    propertyService = new PropertyService()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    const supabase = await propertyService['getSupabase']()
    await supabase.from('properties').delete().in('id', testProperties.map(p => p.id))
    testProperties = []

    // Create comprehensive test dataset
    const properties: PropertyInsert[] = [
      {
        address: '100 Filter Test Lane',
        city: 'Filter City',
        state: 'CA',
        zipcode: '90210',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2.5,
        square_feet: 1800,
        property_type: 'single_family',
        listing_status: 'active',
        year_built: 2020,
        lot_size_sqft: 5000,
        parking_spots: 2,
        amenities: ['pool', 'garage', 'garden'],
        is_active: true
      },
      {
        address: '200 Filter Test Ave',
        city: 'Filter City',
        state: 'CA',
        zipcode: '90211',
        price: 750000,
        bedrooms: 4,
        bathrooms: 3,
        square_feet: 2200,
        property_type: 'single_family',
        listing_status: 'active',
        year_built: 2018,
        lot_size_sqft: 7000,
        parking_spots: 3,
        amenities: ['pool', 'gym', 'office'],
        is_active: true
      },
      {
        address: '300 Filter Test Blvd',
        city: 'Filter City',
        state: 'NY',
        zipcode: '10001',
        price: 450000,
        bedrooms: 2,
        bathrooms: 2,
        square_feet: 1200,
        property_type: 'condo',
        listing_status: 'pending',
        year_built: 2015,
        parking_spots: 1,
        amenities: ['gym', 'concierge'],
        is_active: true
      },
      {
        address: '400 Filter Test Dr',
        city: 'Filter City',
        state: 'CA',
        zipcode: '90212',
        price: 950000,
        bedrooms: 5,
        bathrooms: 4,
        square_feet: 3000,
        property_type: 'townhome',
        listing_status: 'active',
        year_built: 2021,
        lot_size_sqft: 3000,
        parking_spots: 2,
        amenities: ['pool', 'garage', 'patio', 'fireplace'],
        is_active: true
      },
      {
        address: '500 Filter Test Ct',
        city: 'Filter City',
        state: 'CA',
        zipcode: '90213',
        price: 300000,
        bedrooms: 1,
        bathrooms: 1,
        square_feet: 800,
        property_type: 'condo',
        listing_status: 'sold',
        year_built: 2010,
        parking_spots: 1,
        amenities: ['laundry'],
        is_active: true
      }
    ]

    for (const propertyData of properties) {
      const created = await propertyService.createProperty(propertyData)
      if (created) testProperties.push(created)
    }
  })

  describe('Price Range Filtering', () => {
    test('should filter by minimum price only', async () => {
      const result = await propertyService.searchProperties({
        filters: { price_min: 600000 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.price >= 600000)).toBe(true)
    })

    test('should filter by maximum price only', async () => {
      const result = await propertyService.searchProperties({
        filters: { price_max: 500000 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.price <= 500000)).toBe(true)
    })

    test('should filter by price range (min and max)', async () => {
      const result = await propertyService.searchProperties({
        filters: { 
          price_min: 400000,
          price_max: 800000
        }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.price >= 400000 && p.price <= 800000)).toBe(true)
    })

    test('should handle edge case where min equals max', async () => {
      const result = await propertyService.searchProperties({
        filters: { 
          price_min: 500000,
          price_max: 500000
        }
      })

      expect(result.properties.every(p => p.price === 500000)).toBe(true)
    })
  })

  describe('Bedroom and Bathroom Filtering', () => {
    test('should filter by minimum bedrooms', async () => {
      const result = await propertyService.searchProperties({
        filters: { bedrooms_min: 3 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.bedrooms >= 3)).toBe(true)
    })

    test('should filter by maximum bedrooms', async () => {
      const result = await propertyService.searchProperties({
        filters: { bedrooms_max: 3 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.bedrooms <= 3)).toBe(true)
    })

    test('should filter by bedroom range', async () => {
      const result = await propertyService.searchProperties({
        filters: { 
          bedrooms_min: 2,
          bedrooms_max: 4
        }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.bedrooms >= 2 && p.bedrooms <= 4)).toBe(true)
    })

    test('should filter by minimum bathrooms with decimal values', async () => {
      const result = await propertyService.searchProperties({
        filters: { bathrooms_min: 2.5 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.bathrooms >= 2.5)).toBe(true)
    })

    test('should filter by bathroom range', async () => {
      const result = await propertyService.searchProperties({
        filters: { 
          bathrooms_min: 2,
          bathrooms_max: 3
        }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.bathrooms >= 2 && p.bathrooms <= 3)).toBe(true)
    })
  })

  describe('Square Footage Filtering', () => {
    test('should filter by minimum square feet', async () => {
      const result = await propertyService.searchProperties({
        filters: { square_feet_min: 1500 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.square_feet >= 1500)).toBe(true)
    })

    test('should filter by maximum square feet', async () => {
      const result = await propertyService.searchProperties({
        filters: { square_feet_max: 2000 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.square_feet <= 2000)).toBe(true)
    })

    test('should filter by square feet range', async () => {
      const result = await propertyService.searchProperties({
        filters: { 
          square_feet_min: 1000,
          square_feet_max: 2000
        }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => 
        p.square_feet >= 1000 && p.square_feet <= 2000
      )).toBe(true)
    })
  })

  describe('Property Type Filtering', () => {
    test('should filter by single property type', async () => {
      const result = await propertyService.searchProperties({
        filters: { property_types: ['single_family'] }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.property_type === 'single_family')).toBe(true)
    })

    test('should filter by multiple property types', async () => {
      const result = await propertyService.searchProperties({
        filters: { property_types: ['single_family', 'condo'] }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => 
        ['single_family', 'condo'].includes(p.property_type)
      )).toBe(true)
    })

    test('should return empty results for non-existent property type', async () => {
      const result = await propertyService.searchProperties({
        filters: { property_types: ['non_existent_type'] }
      })

      expect(result.properties).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('Year Built Filtering', () => {
    test('should filter by minimum year built', async () => {
      const result = await propertyService.searchProperties({
        filters: { year_built_min: 2018 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.year_built >= 2018)).toBe(true)
    })

    test('should filter by maximum year built', async () => {
      const result = await propertyService.searchProperties({
        filters: { year_built_max: 2015 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.year_built <= 2015)).toBe(true)
    })

    test('should filter by year built range', async () => {
      const result = await propertyService.searchProperties({
        filters: { 
          year_built_min: 2015,
          year_built_max: 2020
        }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => 
        p.year_built >= 2015 && p.year_built <= 2020
      )).toBe(true)
    })
  })

  describe('Lot Size Filtering', () => {
    test('should filter by minimum lot size', async () => {
      const result = await propertyService.searchProperties({
        filters: { lot_size_min: 4000 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => 
        p.lot_size_sqft && p.lot_size_sqft >= 4000
      )).toBe(true)
    })

    test('should filter by maximum lot size', async () => {
      const result = await propertyService.searchProperties({
        filters: { lot_size_max: 6000 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => 
        !p.lot_size_sqft || p.lot_size_sqft <= 6000
      )).toBe(true)
    })

    test('should handle properties with null lot size', async () => {
      const result = await propertyService.searchProperties({
        filters: { lot_size_min: 1000 }
      })

      // Should only return properties with lot_size_sqft values
      expect(result.properties.every(p => p.lot_size_sqft !== null)).toBe(true)
    })
  })

  describe('Parking Spots Filtering', () => {
    test('should filter by minimum parking spots', async () => {
      const result = await propertyService.searchProperties({
        filters: { parking_spots_min: 2 }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => 
        p.parking_spots && p.parking_spots >= 2
      )).toBe(true)
    })
  })

  describe('Listing Status Filtering', () => {
    test('should filter by single listing status', async () => {
      const result = await propertyService.searchProperties({
        filters: { listing_status: ['active'] }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => p.listing_status === 'active')).toBe(true)
    })

    test('should filter by multiple listing statuses', async () => {
      const result = await propertyService.searchProperties({
        filters: { listing_status: ['active', 'pending'] }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => 
        ['active', 'pending'].includes(p.listing_status)
      )).toBe(true)
    })
  })

  describe('Amenities Filtering', () => {
    test('should filter by single amenity', async () => {
      const result = await propertyService.searchProperties({
        filters: { amenities: ['pool'] }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => 
        p.amenities && p.amenities.includes('pool')
      )).toBe(true)
    })

    test('should filter by multiple amenities (AND logic)', async () => {
      const result = await propertyService.searchProperties({
        filters: { amenities: ['pool', 'garage'] }
      })

      expect(result.properties.length).toBeGreaterThan(0)
      expect(result.properties.every(p => 
        p.amenities && 
        p.amenities.includes('pool') && 
        p.amenities.includes('garage')
      )).toBe(true)
    })

    test('should return empty results for non-existent amenity', async () => {
      const result = await propertyService.searchProperties({
        filters: { amenities: ['non_existent_amenity'] }
      })

      expect(result.properties).toHaveLength(0)
    })
  })

  describe('Complex Multi-Filter Combinations', () => {
    test('should handle comprehensive filter combination', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          price_min: 400000,
          price_max: 800000,
          bedrooms_min: 2,
          bedrooms_max: 4,
          bathrooms_min: 2,
          square_feet_min: 1200,
          property_types: ['single_family', 'townhome'],
          year_built_min: 2015,
          parking_spots_min: 2,
          listing_status: ['active'],
          amenities: ['pool']
        }
      })

      // Should apply all filters correctly
      expect(result.properties.every(p => 
        p.price >= 400000 && p.price <= 800000 &&
        p.bedrooms >= 2 && p.bedrooms <= 4 &&
        p.bathrooms >= 2 &&
        p.square_feet >= 1200 &&
        ['single_family', 'townhome'].includes(p.property_type) &&
        p.year_built >= 2015 &&
        p.parking_spots >= 2 &&
        p.listing_status === 'active' &&
        p.amenities && p.amenities.includes('pool')
      )).toBe(true)
    })

    test('should handle conflicting filters gracefully', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          price_min: 900000,
          price_max: 100000 // Max less than min
        }
      })

      expect(result.properties).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    test('should handle very restrictive filters', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          price_min: 999999999, // Impossibly high price
          bedrooms_min: 100,
          bathrooms_min: 50
        }
      })

      expect(result.properties).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('Filter Performance and Edge Cases', () => {
    test('should handle undefined filter values gracefully', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          price_min: undefined,
          price_max: undefined,
          bedrooms_min: undefined,
          property_types: undefined,
          amenities: undefined
        }
      })

      // Should return all properties when filters are undefined
      expect(result.properties.length).toBe(testProperties.length)
    })

    test('should handle null filter values gracefully', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          price_min: null as any,
          bedrooms_min: null as any,
          property_types: null as any
        }
      })

      // Should return all properties when filters are null
      expect(result.properties.length).toBe(testProperties.length)
    })

    test('should handle empty arrays gracefully', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          property_types: [],
          amenities: [],
          listing_status: []
        }
      })

      // Should return all properties when array filters are empty
      expect(result.properties.length).toBe(testProperties.length)
    })

    test('should handle zero values correctly', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          price_min: 0,
          bedrooms_min: 0,
          bathrooms_min: 0,
          square_feet_min: 0,
          year_built_min: 0,
          lot_size_min: 0,
          parking_spots_min: 0
        }
      })

      // Should treat zero as a valid filter value
      expect(result.properties.length).toBe(testProperties.length)
    })

    test('should handle negative values appropriately', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          price_min: -1000,
          bedrooms_min: -5
        }
      })

      // Should still apply filters even with negative values
      expect(result.properties.length).toBe(testProperties.length)
    })
  })

  describe('Filter Query Building Performance', () => {
    test('should build efficient queries with minimal filters', async () => {
      const startTime = Date.now()
      
      const result = await propertyService.searchProperties({
        filters: { price_min: 500000 }
      })

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(result).toBeTruthy()
      // Should complete in reasonable time (under 1 second for test data)
      expect(queryTime).toBeLessThan(1000)
    })

    test('should build efficient queries with maximum filters', async () => {
      const startTime = Date.now()
      
      const result = await propertyService.searchProperties({
        filters: {
          price_min: 100000,
          price_max: 2000000,
          bedrooms_min: 1,
          bedrooms_max: 10,
          bathrooms_min: 1,
          bathrooms_max: 10,
          square_feet_min: 500,
          square_feet_max: 10000,
          property_types: ['single_family', 'condo', 'townhome'],
          year_built_min: 1900,
          year_built_max: 2025,
          lot_size_min: 0,
          lot_size_max: 50000,
          parking_spots_min: 0,
          listing_status: ['active', 'pending', 'sold'],
          amenities: ['pool', 'garage', 'gym']
        }
      })

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(result).toBeTruthy()
      // Should complete in reasonable time even with all filters
      expect(queryTime).toBeLessThan(2000)
    })
  })
})