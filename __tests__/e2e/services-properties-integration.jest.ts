import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { PropertyService } from '@/lib/services/properties'
import { createClient } from '@/lib/supabase/server'
import { setupTestDatabase, cleanupTestDatabase } from '../../fixtures'
import { Property, PropertyInsert, Neighborhood } from '@/types/database'

describe('PropertyService Integration Tests', () => {
  let propertyService: PropertyService
  let testProperties: Property[] = []
  let testNeighborhoods: Neighborhood[] = []
  
  beforeAll(async () => {
    await setupTestDatabase()
    propertyService = new PropertyService()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    const supabase = await createClient()
    await supabase.from('properties').delete().in('id', testProperties.map(p => p.id))
    await supabase.from('neighborhoods').delete().in('id', testNeighborhoods.map(n => n.id))
    testProperties = []
    testNeighborhoods = []
  })

  describe('Property CRUD Operations', () => {
    test('should create and retrieve a property', async () => {
      const propertyData: PropertyInsert = {
        address: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        zipcode: '90210',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1500,
        property_type: 'single_family',
        listing_status: 'active',
        is_active: true
      }

      const createdProperty = await propertyService.createProperty(propertyData)
      expect(createdProperty).toBeTruthy()
      expect(createdProperty?.address).toBe(propertyData.address)
      testProperties.push(createdProperty!)

      const retrievedProperty = await propertyService.getProperty(createdProperty!.id)
      expect(retrievedProperty).toEqual(createdProperty)
    })

    test('should update property details', async () => {
      const propertyData: PropertyInsert = {
        address: '456 Update Street',
        city: 'Update City',
        state: 'CA',
        zipcode: '90211',
        price: 600000,
        bedrooms: 4,
        bathrooms: 3,
        square_feet: 2000,
        property_type: 'single_family',
        listing_status: 'active',
        is_active: true
      }

      const createdProperty = await propertyService.createProperty(propertyData)
      testProperties.push(createdProperty!)

      const updates = { price: 650000, bedrooms: 5 }
      const updatedProperty = await propertyService.updateProperty(createdProperty!.id, updates)
      
      expect(updatedProperty).toBeTruthy()
      expect(updatedProperty?.price).toBe(650000)
      expect(updatedProperty?.bedrooms).toBe(5)
      expect(updatedProperty?.address).toBe(propertyData.address) // Unchanged fields preserved
    })

    test('should soft delete a property', async () => {
      const propertyData: PropertyInsert = {
        address: '789 Delete Street',
        city: 'Delete City',
        state: 'CA',
        zipcode: '90212',
        price: 700000,
        bedrooms: 2,
        bathrooms: 1,
        square_feet: 1000,
        property_type: 'condo',
        listing_status: 'active',
        is_active: true
      }

      const createdProperty = await propertyService.createProperty(propertyData)
      testProperties.push(createdProperty!)

      const deleteResult = await propertyService.deleteProperty(createdProperty!.id)
      expect(deleteResult).toBe(true)

      // Should not be found when searching for active properties
      const retrievedProperty = await propertyService.getProperty(createdProperty!.id)
      expect(retrievedProperty).toBeNull()
    })
  })

  describe('Property Search and Filtering', () => {
    beforeEach(async () => {
      // Create test properties with different characteristics
      const properties: PropertyInsert[] = [
        {
          address: '100 Luxury Lane',
          city: 'Beverly Hills',
          state: 'CA',
          zipcode: '90210',
          price: 2000000,
          bedrooms: 5,
          bathrooms: 4,
          square_feet: 3500,
          property_type: 'single_family',
          listing_status: 'active',
          year_built: 2020,
          lot_size_sqft: 8000,
          parking_spots: 3,
          amenities: ['pool', 'gym', 'garden'],
          is_active: true
        },
        {
          address: '200 Budget Blvd',
          city: 'Affordable City',
          state: 'CA',
          zipcode: '90211',
          price: 300000,
          bedrooms: 2,
          bathrooms: 1,
          square_feet: 800,
          property_type: 'condo',
          listing_status: 'active',
          year_built: 1990,
          parking_spots: 1,
          amenities: ['laundry'],
          is_active: true
        },
        {
          address: '300 Medium Manor',
          city: 'Middle City',
          state: 'CA',
          zipcode: '90212',
          price: 800000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1800,
          property_type: 'townhome',
          listing_status: 'active',
          year_built: 2010,
          lot_size_sqft: 2000,
          parking_spots: 2,
          amenities: ['garage', 'patio'],
          is_active: true
        }
      ]

      for (const propertyData of properties) {
        const created = await propertyService.createProperty(propertyData)
        if (created) testProperties.push(created)
      }
    })

    test('should filter properties by price range', async () => {
      const searchResult = await propertyService.searchProperties({
        filters: {
          price_min: 400000,
          price_max: 1000000
        }
      })

      expect(searchResult.properties).toHaveLength(1)
      expect(searchResult.properties[0].address).toBe('300 Medium Manor')
      expect(searchResult.total).toBe(1)
    })

    test('should filter properties by bedrooms', async () => {
      const searchResult = await propertyService.searchProperties({
        filters: {
          bedrooms_min: 3
        }
      })

      expect(searchResult.properties).toHaveLength(2)
      expect(searchResult.properties.every(p => p.bedrooms >= 3)).toBe(true)
    })

    test('should filter properties by property type', async () => {
      const searchResult = await propertyService.searchProperties({
        filters: {
          property_types: ['single_family']
        }
      })

      expect(searchResult.properties).toHaveLength(1)
      expect(searchResult.properties[0].property_type).toBe('single_family')
    })

    test('should filter properties by amenities', async () => {
      const searchResult = await propertyService.searchProperties({
        filters: {
          amenities: ['pool']
        }
      })

      expect(searchResult.properties).toHaveLength(1)
      expect(searchResult.properties[0].amenities).toContain('pool')
    })

    test('should handle complex multi-filter search', async () => {
      const searchResult = await propertyService.searchProperties({
        filters: {
          price_min: 200000,
          price_max: 900000,
          bedrooms_min: 2,
          bedrooms_max: 3,
          property_types: ['condo', 'townhome']
        }
      })

      expect(searchResult.properties).toHaveLength(2)
      expect(searchResult.properties.every(p => 
        p.price >= 200000 && 
        p.price <= 900000 && 
        p.bedrooms >= 2 && 
        p.bedrooms <= 3 &&
        ['condo', 'townhome'].includes(p.property_type)
      )).toBe(true)
    })

    test('should handle pagination correctly', async () => {
      const page1 = await propertyService.searchProperties({
        pagination: { page: 1, limit: 2 }
      })

      const page2 = await propertyService.searchProperties({
        pagination: { page: 2, limit: 2 }
      })

      expect(page1.properties).toHaveLength(2)
      expect(page1.page).toBe(1)
      expect(page1.limit).toBe(2)
      expect(page1.total).toBe(3)

      expect(page2.properties).toHaveLength(1)
      expect(page2.page).toBe(2)
      expect(page2.limit).toBe(2)
      expect(page2.total).toBe(3)

      // Ensure no duplicate properties between pages
      const page1Ids = page1.properties.map(p => p.id)
      const page2Ids = page2.properties.map(p => p.id)
      expect(page1Ids.some(id => page2Ids.includes(id))).toBe(false)
    })

    test('should handle sorting', async () => {
      const searchResult = await propertyService.searchProperties({
        pagination: {
          sort: { field: 'price', direction: 'asc' }
        }
      })

      expect(searchResult.properties).toHaveLength(3)
      expect(searchResult.properties[0].price).toBe(300000)
      expect(searchResult.properties[1].price).toBe(800000)
      expect(searchResult.properties[2].price).toBe(2000000)
    })

    test('should return empty results for impossible filters', async () => {
      const searchResult = await propertyService.searchProperties({
        filters: {
          price_min: 5000000, // Higher than any test property
          bedrooms_min: 10
        }
      })

      expect(searchResult.properties).toHaveLength(0)
      expect(searchResult.total).toBe(0)
    })
  })

  describe('Neighborhood Operations', () => {
    test('should create and retrieve neighborhoods', async () => {
      const neighborhoodData = {
        name: 'Test Neighborhood',
        city: 'Test City',
        state: 'CA',
        metro_area: 'Greater Test Area',
        latitude: 34.0522,
        longitude: -118.2437
      }

      const createdNeighborhood = await propertyService.createNeighborhood(neighborhoodData)
      expect(createdNeighborhood).toBeTruthy()
      expect(createdNeighborhood?.name).toBe(neighborhoodData.name)
      testNeighborhoods.push(createdNeighborhood!)

      const retrievedNeighborhood = await propertyService.getNeighborhood(createdNeighborhood!.id)
      expect(retrievedNeighborhood).toEqual(createdNeighborhood)
    })

    test('should search neighborhoods by text', async () => {
      const neighborhoods = [
        { name: 'Beverly Hills', city: 'Beverly Hills', state: 'CA', metro_area: 'Los Angeles' },
        { name: 'Hollywood', city: 'Los Angeles', state: 'CA', metro_area: 'Los Angeles' },
        { name: 'Santa Monica', city: 'Santa Monica', state: 'CA', metro_area: 'Los Angeles' }
      ]

      for (const neighborhood of neighborhoods) {
        const created = await propertyService.createNeighborhood(neighborhood)
        if (created) testNeighborhoods.push(created)
      }

      const searchResults = await propertyService.searchNeighborhoods('hills')
      expect(searchResults).toHaveLength(1)
      expect(searchResults[0].name).toBe('Beverly Hills')
    })

    test('should get neighborhoods by city', async () => {
      const neighborhoods = [
        { name: 'Downtown', city: 'Los Angeles', state: 'CA', metro_area: 'Los Angeles' },
        { name: 'Westside', city: 'Los Angeles', state: 'CA', metro_area: 'Los Angeles' },
        { name: 'Beach City', city: 'Santa Monica', state: 'CA', metro_area: 'Los Angeles' }
      ]

      for (const neighborhood of neighborhoods) {
        const created = await propertyService.createNeighborhood(neighborhood)
        if (created) testNeighborhoods.push(created)
      }

      const laNeighborhoods = await propertyService.getNeighborhoodsByCity('Los Angeles', 'CA')
      expect(laNeighborhoods).toHaveLength(2)
      expect(laNeighborhoods.every(n => n.city === 'Los Angeles')).toBe(true)
    })
  })

  describe('Property Analytics', () => {
    beforeEach(async () => {
      const properties: PropertyInsert[] = [
        {
          address: '100 Analytics Ave',
          city: 'Stats City',
          state: 'CA',
          zipcode: '90210',
          price: 500000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1500,
          property_type: 'single_family',
          listing_status: 'active',
          is_active: true
        },
        {
          address: '200 Analytics Ave',
          city: 'Stats City',
          state: 'CA',
          zipcode: '90210',
          price: 700000,
          bedrooms: 4,
          bathrooms: 3,
          square_feet: 2000,
          property_type: 'single_family',
          listing_status: 'active',
          is_active: true
        },
        {
          address: '300 Analytics Ave',
          city: 'Stats City',
          state: 'CA',
          zipcode: '90210',
          price: 300000,
          bedrooms: 2,
          bathrooms: 1,
          square_feet: 1000,
          property_type: 'condo',
          listing_status: 'active',
          is_active: true
        }
      ]

      for (const propertyData of properties) {
        const created = await propertyService.createProperty(propertyData)
        if (created) testProperties.push(created)
      }
    })

    test('should calculate property statistics correctly', async () => {
      const stats = await propertyService.getPropertyStats()
      
      expect(stats).toBeTruthy()
      expect(stats?.total_properties).toBe(3)
      expect(stats?.avg_price).toBe(500000) // (500k + 700k + 300k) / 3
      expect(stats?.median_price).toBe(500000) // Middle value when sorted
      expect(stats?.avg_bedrooms).toBe(3) // (3 + 4 + 2) / 3
      expect(stats?.avg_bathrooms).toBe(2) // (2 + 3 + 1) / 3
      expect(stats?.avg_square_feet).toBe(1500) // (1500 + 2000 + 1000) / 3
      expect(stats?.property_type_distribution).toEqual({
        'single_family': 2,
        'condo': 1
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle non-existent property gracefully', async () => {
      const result = await propertyService.getProperty('non-existent-id')
      expect(result).toBeNull()
    })

    test('should handle invalid property data gracefully', async () => {
      // Missing required fields
      const invalidProperty = {
        address: 'Invalid Property'
        // Missing required fields like city, state, etc.
      } as PropertyInsert

      const result = await propertyService.createProperty(invalidProperty)
      expect(result).toBeNull()
    })

    test('should handle invalid search parameters gracefully', async () => {
      const result = await propertyService.searchProperties({
        filters: {
          price_min: -1000, // Negative price
          bedrooms_min: -5 // Negative bedrooms
        }
      })

      // Should return empty results for invalid parameters
      expect(result.properties).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('Integration with Neighborhoods', () => {
    test('should retrieve property with neighborhood details', async () => {
      // Create neighborhood first
      const neighborhood = await propertyService.createNeighborhood({
        name: 'Test Neighborhood',
        city: 'Test City',
        state: 'CA',
        metro_area: 'Test Metro'
      })
      testNeighborhoods.push(neighborhood!)

      // Create property in neighborhood
      const property = await propertyService.createProperty({
        address: '123 Neighborhood St',
        city: 'Test City',
        state: 'CA',
        zipcode: '90210',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        square_feet: 1500,
        property_type: 'single_family',
        listing_status: 'active',
        neighborhood_id: neighborhood!.id,
        is_active: true
      })
      testProperties.push(property!)

      const propertyWithNeighborhood = await propertyService.getPropertyWithNeighborhood(property!.id)
      expect(propertyWithNeighborhood).toBeTruthy()
      expect(propertyWithNeighborhood?.neighborhood).toBeTruthy()
      expect(propertyWithNeighborhood?.neighborhood?.name).toBe('Test Neighborhood')
    })

    test('should get properties by neighborhood', async () => {
      // Create neighborhood
      const neighborhood = await propertyService.createNeighborhood({
        name: 'Property Neighborhood',
        city: 'Property City',
        state: 'CA',
        metro_area: 'Property Metro'
      })
      testNeighborhoods.push(neighborhood!)

      // Create multiple properties in the neighborhood
      const properties: PropertyInsert[] = [
        {
          address: '100 Neighborhood Ave',
          city: 'Property City',
          state: 'CA',
          zipcode: '90210',
          price: 400000,
          bedrooms: 2,
          bathrooms: 1,
          square_feet: 1000,
          property_type: 'condo',
          listing_status: 'active',
          neighborhood_id: neighborhood!.id,
          is_active: true
        },
        {
          address: '200 Neighborhood Ave',
          city: 'Property City',
          state: 'CA',
          zipcode: '90210',
          price: 600000,
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1500,
          property_type: 'single_family',
          listing_status: 'active',
          neighborhood_id: neighborhood!.id,
          is_active: true
        }
      ]

      for (const propertyData of properties) {
        const created = await propertyService.createProperty(propertyData)
        if (created) testProperties.push(created)
      }

      const neighborhoodProperties = await propertyService.getPropertiesByNeighborhood(neighborhood!.id)
      expect(neighborhoodProperties).toHaveLength(2)
      expect(neighborhoodProperties.every(p => p.neighborhood_id === neighborhood!.id)).toBe(true)
    })
  })
})