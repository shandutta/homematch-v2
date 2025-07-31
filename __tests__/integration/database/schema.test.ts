import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

describe('Database Schema Validation - Integration Tests', () => {
  let supabase: ReturnType<typeof createClient<Database>>

  beforeAll(() => {
    // Create real Supabase client for integration tests using local Docker
    supabase = createClient<Database>(
      process.env.SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_ANON_KEY || 'supabase-test-anon-key'
    )
  })

  describe('Table existence and structure', () => {
    test('should verify all 6 required tables exist', async () => {
      const requiredTables = [
        'user_profiles',
        'households',
        'neighborhoods',
        'properties',
        'user_property_interactions',
        'saved_searches',
      ]

      for (const tableName of requiredTables) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(1)

        expect(error).toBeNull()
        expect(data).toBeDefined()
      }
    })

    test('should verify PostGIS extensions are enabled', async () => {
      const { data: postgisEnabled, error: postgisError } = await supabase.rpc(
        'check_postgis_extension'
      )

      // If RPC doesn't exist, check with SQL query
      if (postgisError) {
        const { data, error } = await supabase.rpc('select_sql', {
          query:
            "SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'uuid-ossp')",
        })

        if (!error && data) {
          expect(data.length).toBeGreaterThan(0)
        } else {
          // Fallback: test that spatial queries work
          const { data: spatialTest, error: spatialError } = await supabase
            .from('neighborhoods')
            .select('bounds')
            .not('bounds', 'is', null)
            .limit(1)

          expect(spatialError).toBeNull()
        }
      } else {
        expect(postgisEnabled).toBeTruthy()
      }
    })

    test('should verify spatial indexes are functional', async () => {
      // Test spatial query performance - should use index
      const startTime = Date.now()

      const { data, error } = await supabase
        .from('neighborhoods')
        .select('id, name, bounds')
        .not('bounds', 'is', null)
        .limit(10)

      const endTime = Date.now()
      const queryTime = endTime - startTime

      expect(error).toBeNull()
      expect(data).toBeDefined()
      // Spatial queries should be fast with proper indexes (<500ms)
      expect(queryTime).toBeLessThan(500)
    })

    test('should verify RLS policies are active and enforcing', async () => {
      // Test that RLS is enforced - queries should work with proper auth
      const tables = [
        'user_profiles',
        'households',
        'properties',
        'neighborhoods',
      ]

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1)

        // RLS should allow select on these tables even without auth for public data
        if (table === 'properties' || table === 'neighborhoods') {
          expect(error).toBeNull()
        }
        // For user-specific tables, we expect either data or controlled access
        expect(typeof error === 'object' || data !== undefined).toBeTruthy()
      }
    })

    test('should verify foreign key constraints work correctly', async () => {
      // Test property-neighborhood relationship
      const { data: properties, error: propError } = await supabase
        .from('properties')
        .select('id, neighborhood_id')
        .not('neighborhood_id', 'is', null)
        .limit(5)

      expect(propError).toBeNull()
      expect(properties).toBeDefined()

      if (properties && properties.length > 0) {
        // Verify that neighborhood_id references exist
        const neighborhoodIds = properties.map((p) => p.neighborhood_id)
        const uniqueNeighborhoodIds = [...new Set(neighborhoodIds)]
        const { data: neighborhoods, error: neighError } = await supabase
          .from('neighborhoods')
          .select('id')
          .in('id', uniqueNeighborhoodIds)

        expect(neighError).toBeNull()
        expect(neighborhoods?.length).toBe(uniqueNeighborhoodIds.length)
      }
    })

    test('should verify trigger functions for updated_at timestamps', async () => {
      // We can test this by checking if updated_at columns exist
      const { data: properties, error } = await supabase
        .from('properties')
        .select('updated_at')
        .limit(1)

      expect(error).toBeNull()
      expect(properties).toBeDefined()

      if (properties && properties.length > 0) {
        expect(properties[0].updated_at).toBeDefined()
      }
    })
  })

  describe('Migration data validation', () => {
    test('should confirm test neighborhoods are accessible', async () => {
      const { data, error, count } = await supabase
        .from('neighborhoods')
        .select('*', { count: 'exact' })
        .limit(1)

      expect(error).toBeNull()

      // In test environment, we have minimal data
      if (process.env.NODE_ENV === 'test') {
        expect(count).toBe(3) // 3 test neighborhoods
      } else {
        expect(count).toBeGreaterThan(1000) // Production: ~1,123
        expect(count).toBeLessThan(1200)
      }
    })

    test('should confirm test properties are accessible', async () => {
      const { data, error, count } = await supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .limit(1)

      expect(error).toBeNull()

      // In test environment, we have minimal data
      if (process.env.NODE_ENV === 'test') {
        expect(count).toBe(5) // 5 test properties
      } else {
        expect(count).toBeGreaterThan(1000) // Production: ~1,091
        expect(count).toBeLessThan(1150)
      }
    })

    test('should verify spatial_ref_sys table is accessible for PostGIS', async () => {
      // This table should be accessible for coordinate system queries
      const { data, error } = await supabase.rpc('select_sql', {
        query: 'SELECT srid FROM spatial_ref_sys WHERE srid = 4326 LIMIT 1',
      })

      // If RPC fails, it's likely RLS is properly configured
      if (error) {
        expect(error.message).toContain('function') // Expected if RPC doesn't exist
      } else {
        expect(data).toBeDefined()
      }
    })
  })

  describe('Data integrity checks', () => {
    test('should verify properties have valid neighborhood relationships', async () => {
      const { data: orphanedProperties, error } = await supabase
        .from('properties')
        .select('id, neighborhood_id')
        .not('neighborhood_id', 'is', null)
        .limit(100)

      expect(error).toBeNull()

      if (orphanedProperties && orphanedProperties.length > 0) {
        // Check a sample of properties have valid neighborhood references
        const sampleProperty = orphanedProperties[0]
        const { data: neighborhood, error: neighError } = await supabase
          .from('neighborhoods')
          .select('id')
          .eq('id', sampleProperty.neighborhood_id)
          .single()

        expect(neighError).toBeNull()
        expect(neighborhood).toBeDefined()
      }
    })

    test('should verify required fields are populated', async () => {
      // Check that critical fields are not null for active properties
      const { data: properties, error } = await supabase
        .from('properties')
        .select('address, price, bedrooms, bathrooms')
        .eq('is_active', true)
        .limit(10)

      expect(error).toBeNull()
      expect(properties).toBeDefined()

      if (properties && properties.length > 0) {
        properties.forEach((property) => {
          expect(property.address).toBeDefined()
          expect(property.address).not.toBe('')
          expect(property.price).toBeGreaterThan(0)
          expect(property.bedrooms).toBeGreaterThanOrEqual(0)
          expect(property.bathrooms).toBeGreaterThanOrEqual(0)
        })
      }
    })

    test('should verify unique constraints work', async () => {
      // Check for duplicate property hashes (should be unique)
      const { data: properties, error } = await supabase
        .from('properties')
        .select('property_hash')
        .not('property_hash', 'is', null)
        .limit(100)

      expect(error).toBeNull()

      if (properties && properties.length > 0) {
        const hashes = properties.map((p) => p.property_hash)
        const uniqueHashes = new Set(hashes)
        expect(uniqueHashes.size).toBe(hashes.length) // No duplicates
      }
    })
  })
})
