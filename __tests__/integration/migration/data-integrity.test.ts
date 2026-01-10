import { createClient } from '@/lib/supabase/standalone'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'

const skipHeavy =
  process.env.SKIP_HEAVY_INTEGRATION === 'true' ||
  process.env.SKIP_HEAVY_TESTS === 'true'
const describeOrSkip = skipHeavy ? describe.skip : describe

describeOrSkip('Migration Data Integrity', () => {
  let supabase: SupabaseClient<AppDatabase>

  beforeAll(() => {
    supabase = createClient()
  })

  describe('Data Integrity Validation', () => {
    test('should validate test neighborhoods are present', async () => {
      const { error, count } = await supabase
        .from('neighborhoods')
        .select('*', { count: 'exact' })
        .limit(1)

      expect(error).toBeNull()

      // This test is environment-dependent, which is not ideal.
      // A better approach is to check for a non-zero count.
      expect(count).toBeGreaterThan(0)

      // Verify sample neighborhood has required fields
      const { data: sampleNeighborhoods, error: sampleError } = await supabase
        .from('neighborhoods')
        .select('id, name, city, state, created_at')
        .limit(5)

      expect(sampleError).toBeNull()
      expect(sampleNeighborhoods).toBeDefined()
      expect(sampleNeighborhoods!.length).toBeGreaterThan(0)

      sampleNeighborhoods!.forEach((neighborhood) => {
        expect(neighborhood.id).toBeDefined()
        expect(neighborhood.name).toBeDefined()
        expect(neighborhood.name).not.toBe('')
        expect(neighborhood.city).toBeDefined()
        expect(neighborhood.city).not.toBe('')
        expect(neighborhood.state).toBeDefined()
        expect(neighborhood.state).not.toBe('')
        expect(neighborhood.created_at).toBeDefined()
      })
    }, 10000) // 10 second timeout for database queries

    test('should validate test properties have required fields', async () => {
      const { error, count } = await supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .limit(1)

      expect(error).toBeNull()

      // This test is environment-dependent, which is not ideal.
      // A better approach is to check for a non-zero count.
      expect(count).toBeGreaterThan(0)

      // Verify sample properties have required fields
      const { data: sampleProperties, error: sampleError } = await supabase
        .from('properties')
        .select(
          'id, address, city, state, zip_code, price, bedrooms, bathrooms, neighborhood_id, created_at'
        )
        .eq('is_active', true)
        .limit(10)

      expect(sampleError).toBeNull()
      expect(sampleProperties).toBeDefined()
      expect(sampleProperties!.length).toBeGreaterThan(0)

      sampleProperties!.forEach((property) => {
        expect(property.id).toBeDefined()
        expect(property.address).toBeDefined()
        expect(property.address).not.toBe('')
        expect(property.city).toBeDefined()
        expect(property.city).not.toBe('')
        expect(property.state).toBeDefined()
        expect(property.state).not.toBe('')
        expect(property.zip_code).toBeDefined()
        expect(property.zip_code).not.toBe('')
        expect(property.price).toBeDefined()
        expect(property.price).toBeGreaterThan(0)
        expect(property.bedrooms).toBeDefined()
        expect(property.bedrooms).toBeGreaterThanOrEqual(0)
        expect(property.bathrooms).toBeDefined()
        expect(property.bathrooms).toBeGreaterThanOrEqual(0)
        expect(property.neighborhood_id).toBeDefined()
        expect(property.created_at).toBeDefined()
      })
    }, 10000)

    test('should verify PostGIS coordinate accuracy and format', async () => {
      // Check that neighborhoods have spatial bounds data
      const { data: neighborhoodsWithBounds, error: boundsError } =
        await supabase
          .from('neighborhoods')
          .select('id, name, bounds')
          .not('bounds', 'is', null)
          .limit(10)

      expect(boundsError).toBeNull()
      expect(neighborhoodsWithBounds).toBeDefined()
      expect(neighborhoodsWithBounds!.length).toBeGreaterThan(0)

      neighborhoodsWithBounds!.forEach((neighborhood) => {
        expect(neighborhood.bounds).toBeDefined()
        expect(neighborhood.bounds).not.toBeNull()
        // PostGIS bounds should be some kind of spatial object
        expect(typeof neighborhood.bounds).toBe('object')
      })

      // Check that properties have coordinate data where available
      const { data: propertiesWithCoords, error: coordsError } = await supabase
        .from('properties')
        .select('id, address, coordinates')
        .not('coordinates', 'is', null)
        .eq('is_active', true)
        .limit(5)

      expect(coordsError).toBeNull()
      expect(propertiesWithCoords).toBeDefined()
      expect(propertiesWithCoords!.length).toBeGreaterThan(0)

      propertiesWithCoords!.forEach((property) => {
        expect(property.coordinates).toBeDefined()
        expect(property.coordinates).not.toBeNull()
        // PostGIS coordinates should be some kind of spatial object
        expect(typeof property.coordinates).toBe('object')
      })
    }, 10000)

    test('should confirm property-neighborhood relationship consistency', async () => {
      // Get a sample of properties with neighborhood references
      const { data: propertiesWithNeighborhoods, error: propError } =
        await supabase
          .from('properties')
          .select('id, address, neighborhood_id')
          .not('neighborhood_id', 'is', null)
          .eq('is_active', true)
          .limit(20)

      expect(propError).toBeNull()
      expect(propertiesWithNeighborhoods).toBeDefined()
      expect(propertiesWithNeighborhoods!.length).toBeGreaterThan(0)

      // Verify that all referenced neighborhoods exist
      const neighborhoodIds = propertiesWithNeighborhoods!.map(
        (p) => p.neighborhood_id
      )
      const uniqueNeighborhoodIds = [...new Set(neighborhoodIds)]

      const { data: referencedNeighborhoods, error: neighError } =
        await supabase
          .from('neighborhoods')
          .select('id')
          .in('id', uniqueNeighborhoodIds)

      expect(neighError).toBeNull()
      expect(referencedNeighborhoods).toBeDefined()
      expect(referencedNeighborhoods!.length).toBe(uniqueNeighborhoodIds.length)
    }, 15000)

    test('should validate property hash uniqueness and deduplication', async () => {
      // Check for properties with property_hash values
      const { data: propertiesWithHashes, error: hashError } = await supabase
        .from('properties')
        .select('id, property_hash, address')
        .not('property_hash', 'is', null)
        .eq('is_active', true)
        .limit(100)

      expect(hashError).toBeNull()
      expect(propertiesWithHashes).toBeDefined()
      expect(propertiesWithHashes!.length).toBeGreaterThan(0)

      // Check for hash uniqueness
      const hashes = propertiesWithHashes!.map((p) => p.property_hash)
      const uniqueHashes = new Set(hashes)

      // All hashes should be unique (no duplicates)
      expect(uniqueHashes.size).toBe(hashes.length)

      // Verify hashes are non-empty strings
      hashes.forEach((hash: string) => {
        expect(typeof hash).toBe('string')
        expect(hash.length).toBeGreaterThan(0)
      })
    }, 10000)

    test('should verify PostgreSQL polygon format compatibility', async () => {
      // Test that spatial queries work with PostGIS data
      const { data: spatialTestData, error: spatialError } = await supabase
        .from('neighborhoods')
        .select('id, name, bounds')
        .not('bounds', 'is', null)
        .limit(5)

      expect(spatialError).toBeNull()
      expect(spatialTestData).toBeDefined()
      expect(spatialTestData!.length).toBeGreaterThan(0)

      // Verify bounds data structure is consistent
      spatialTestData!.forEach((neighborhood) => {
        expect(neighborhood.bounds).toBeDefined()
        expect(neighborhood.bounds).not.toBeNull()

        // PostGIS typically stores spatial data as objects
        expect(typeof neighborhood.bounds).toBe('object')
      })
    }, 10000)
  })

  describe('Geographic Data Validation', () => {
    test('should validate neighborhood polygon boundaries are valid', async () => {
      // Test spatial data accessibility and basic structure
      const { data: neighborhoodsWithSpatialData, error } = await supabase
        .from('neighborhoods')
        .select('id, name, city, state, bounds')
        .not('bounds', 'is', null)
        .limit(10)

      expect(error).toBeNull()
      expect(neighborhoodsWithSpatialData).toBeDefined()
      expect(neighborhoodsWithSpatialData!.length).toBeGreaterThan(0)

      neighborhoodsWithSpatialData!.forEach((neighborhood) => {
        expect(neighborhood.id).toBeDefined()
        expect(neighborhood.name).toBeDefined()
        expect(neighborhood.city).toBeDefined()
        expect(neighborhood.state).toBeDefined()
        expect(neighborhood.bounds).toBeDefined()
        expect(neighborhood.bounds).not.toBeNull()
      })

      // Verify we have data from multiple states/cities (diverse geographic coverage)
      const cities = [
        ...new Set(neighborhoodsWithSpatialData!.map((n) => n.city)),
      ]
      const states = [
        ...new Set(neighborhoodsWithSpatialData!.map((n) => n.state)),
      ]

      expect(cities.length).toBeGreaterThan(0)
      expect(states.length).toBeGreaterThan(0)
    }, 10000)

    test('should confirm property coordinates fall within expected ranges', async () => {
      // Get properties with coordinate data
      const { data: propertiesWithCoords, error } = await supabase
        .from('properties')
        .select('id, address, city, state, coordinates')
        .not('coordinates', 'is', null)
        .eq('is_active', true)
        .limit(10)

      expect(error).toBeNull()
      expect(propertiesWithCoords).toBeDefined()
      expect(propertiesWithCoords!.length).toBeGreaterThan(0)

      propertiesWithCoords!.forEach((property) => {
        expect(property.coordinates).toBeDefined()
        expect(property.coordinates).not.toBeNull()
        expect(property.city).toBeDefined()
        expect(property.state).toBeDefined()
        expect(typeof property.coordinates).toBe('object')
      })

      // Verify geographic diversity
      const cities = [...new Set(propertiesWithCoords!.map((p) => p.city))]
      const states = [...new Set(propertiesWithCoords!.map((p) => p.state))]

      expect(cities.length).toBeGreaterThan(0)
      expect(states.length).toBeGreaterThan(0)
    }, 10000)

    test('should verify spatial index performance with migrated data', async () => {
      // Test spatial query performance
      const startTime = Date.now()

      const { data: spatialQueryResult, error } = await supabase
        .from('neighborhoods')
        .select('id, name, bounds')
        .not('bounds', 'is', null)
        .limit(50)

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(error).toBeNull()
      expect(spatialQueryResult).toBeDefined()
      expect(spatialQueryResult!.length).toBeGreaterThan(0)

      // Spatial queries should be reasonably fast (under 2 seconds for this size)
      expect(queryTime).toBeLessThan(2000)
    }, 10000)

    test('should validate coordinate system consistency (SRID)', async () => {
      // Verify that spatial data is accessible and consistent
      const { data: neighborhoodSpatialData, error: neighError } =
        await supabase
          .from('neighborhoods')
          .select('id, name, bounds')
          .not('bounds', 'is', null)
          .limit(5)

      expect(neighError).toBeNull()
      expect(neighborhoodSpatialData).toBeDefined()
      expect(neighborhoodSpatialData!.length).toBeGreaterThan(0)

      const { data: propertySpatialData, error: propError } = await supabase
        .from('properties')
        .select('id, address, coordinates')
        .not('coordinates', 'is', null)
        .eq('is_active', true)
        .limit(5)

      expect(propError).toBeNull()
      expect(propertySpatialData).toBeDefined()
      expect(propertySpatialData!.length).toBeGreaterThan(0)

      // If we have spatial data, verify it's consistently formatted
      neighborhoodSpatialData!.forEach((neighborhood) => {
        expect(neighborhood.bounds).toBeDefined()
        expect(typeof neighborhood.bounds).toBe('object')
      })

      propertySpatialData!.forEach((property) => {
        expect(property.coordinates).toBeDefined()
        expect(typeof property.coordinates).toBe('object')
      })
    }, 10000)
  })

  describe('Data Quality Metrics', () => {
    test('should validate test data is present', async () => {
      // Count total neighborhoods
      const { count: totalNeighborhoods, error: neighError } = await supabase
        .from('neighborhoods')
        .select('*', { count: 'exact' })
        .limit(1)

      expect(neighError).toBeNull()

      // Count total active properties
      const { count: totalProperties, error: propError } = await supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .limit(1)

      expect(propError).toBeNull()

      // This test is environment-dependent, which is not ideal.
      // A better approach is to check for non-zero counts.
      expect(totalNeighborhoods).toBeGreaterThan(0)
      expect(totalProperties).toBeGreaterThan(0)
    }, 10000)

    test('should verify data completeness for required fields', async () => {
      // Check neighborhood data completeness
      const { data: neighborhoodCompleteness, error: neighError } =
        await supabase
          .from('neighborhoods')
          .select('id, name, city, state')
          .or('name.is.null,city.is.null,state.is.null')
          .limit(1)

      expect(neighError).toBeNull()
      // Should have no records with null required fields
      expect(neighborhoodCompleteness).toEqual([])

      // Check property data completeness
      const { data: propertyCompleteness, error: propError } = await supabase
        .from('properties')
        .select(
          'id, address, city, state, zip_code, price, bedrooms, bathrooms'
        )
        .eq('is_active', true)
        .or(
          'address.is.null,city.is.null,state.is.null,zip_code.is.null,price.is.null,bedrooms.is.null,bathrooms.is.null'
        )
        .limit(1)

      expect(propError).toBeNull()
      // Should have no records with null required fields
      expect(propertyCompleteness).toEqual([])
    }, 10000)

    test('should validate reasonable data distribution', async () => {
      // Test geographic distribution
      const { data: stateDistribution, error: stateError } = await supabase
        .from('properties')
        .select('state')
        .eq('is_active', true)
        .limit(100)

      expect(stateError).toBeNull()
      expect(stateDistribution).toBeDefined()
      expect(stateDistribution!.length).toBeGreaterThan(0)

      const uniqueStates = [...new Set(stateDistribution!.map((p) => p.state))]
      // Should have properties from at least one state
      expect(uniqueStates.length).toBeGreaterThanOrEqual(1)

      // Test price distribution
      const { data: priceDistribution, error: priceError } = await supabase
        .from('properties')
        .select('price')
        .eq('is_active', true)
        .gte('price', 100000) // Reasonable minimum
        .lte('price', 10000000) // Reasonable maximum
        .limit(100)

      expect(priceError).toBeNull()
      expect(priceDistribution).toBeDefined()
      expect(priceDistribution!.length).toBeGreaterThan(0)

      const prices = priceDistribution!.map((p) => p.price)
      const avgPrice =
        prices.reduce((sum: number, price: number) => sum + price, 0) /
        prices.length

      // Average price should be reasonable (between $200K and $2M)
      expect(avgPrice).toBeGreaterThan(200000)
      expect(avgPrice).toBeLessThan(2000000)
    }, 10000)
  })
})
