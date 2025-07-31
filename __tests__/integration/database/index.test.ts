import { createClient } from '@/lib/supabase/standalone'

// Helper to get test users dynamically
async function getTestUsers(supabase: any) {
  // Get auth users first
  const testEmails = ['test1@example.com', 'test2@example.com']

  // Since we can't query auth.users directly from client, we'll get profiles by hardcoded IDs
  // These are the IDs from our test user setup
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id')
    .order('created_at')

  if (error || !profiles || profiles.length === 0) {
    throw new Error(
      'Test user profiles not found. Run scripts/setup-test-users-admin.js first.'
    )
  }

  // Return the first two profiles (our test users)
  return {
    user1: { id: profiles[0].id, email: testEmails[0] },
    user2: {
      id: profiles.length > 1 ? profiles[1].id : profiles[0].id,
      email: testEmails[1],
    },
  }
}

// Helper to get test property
async function getTestProperty(supabase: any) {
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error || !properties) {
    throw new Error('No test properties found in database.')
  }

  return properties.id
}

// Helper to get test household
async function getTestHousehold(supabase: any, userId: string) {
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('household_id')
    .eq('id', userId)
    .single()

  if (error || !user || !user.household_id) {
    // Create a test household if none exists
    const { data: household, error: createError } = await supabase
      .from('households')
      .insert({
        name: 'Test Family',
        collaboration_mode: 'shared',
      })
      .select()
      .single()

    if (createError || !household) {
      throw new Error('Could not create test household')
    }

    // Update user with household
    await supabase
      .from('user_profiles')
      .update({ household_id: household.id })
      .eq('id', userId)

    return household.id
  }

  return user.household_id
}

describe('Database Integration Tests', () => {
  let supabase: any
  let testUsers: any
  let testPropertyId: string
  let testHouseholdId: string

  beforeAll(async () => {
    supabase = createClient()

    // Get test users and data
    testUsers = await getTestUsers(supabase)
    testPropertyId = await getTestProperty(supabase)
    testHouseholdId = await getTestHousehold(supabase, testUsers.user1.id)

    // Ensure both test users are in the same household
    await supabase
      .from('user_profiles')
      .update({ household_id: testHouseholdId })
      .in('id', [testUsers.user1.id, testUsers.user2.id])
  })

  describe('Property-Neighborhood Relationships', () => {
    test('should verify property-neighborhood foreign key relationships', async () => {
      // Get properties with neighborhood references
      const { data: propertiesWithNeighborhoods, error: propError } =
        await supabase
          .from('properties')
          .select('id, address, neighborhood_id, neighborhoods(id, name, city)')
          .not('neighborhood_id', 'is', null)
          .eq('is_active', true)
          .limit(10)

      expect(propError).toBeNull()
      expect(propertiesWithNeighborhoods).toBeDefined()

      if (
        propertiesWithNeighborhoods &&
        propertiesWithNeighborhoods.length > 0
      ) {
        propertiesWithNeighborhoods.forEach((property: any) => {
          expect(property.id).toBeDefined()
          expect(property.neighborhood_id).toBeDefined()
          expect(property.neighborhoods).toBeDefined()
          expect(property.neighborhoods.id).toBe(property.neighborhood_id)
          expect(property.neighborhoods.name).toBeDefined()
          expect(property.neighborhoods.city).toBeDefined()
        })
      }
    }, 15000)

    test('should validate spatial relationship queries work correctly', async () => {
      // Test spatial queries between properties and neighborhoods
      const { data: spatialData, error: spatialError } = await supabase
        .from('properties')
        .select(
          `
          id, 
          address, 
          coordinates,
          neighborhoods!inner(id, name, bounds)
        `
        )
        .not('coordinates', 'is', null)
        .not('neighborhoods.bounds', 'is', null)
        .eq('is_active', true)
        .limit(5)

      expect(spatialError).toBeNull()
      expect(spatialData).toBeDefined()

      if (spatialData && spatialData.length > 0) {
        spatialData.forEach((property: any) => {
          expect(property.coordinates).toBeDefined()
          expect(property.neighborhoods).toBeDefined()
          expect(property.neighborhoods.bounds).toBeDefined()
          expect(typeof property.coordinates).toBe('object')
          expect(typeof property.neighborhoods.bounds).toBe('object')
        })
      }
    }, 15000)

    test('should ensure property counts per neighborhood are reasonable', async () => {
      // Get neighborhood property counts
      const { data: neighborhoodCounts, error: countError } = await supabase
        .from('neighborhoods')
        .select(
          `
          id, 
          name,
          properties!neighborhood_id(count)
        `
        )
        .limit(20)

      expect(countError).toBeNull()
      expect(neighborhoodCounts).toBeDefined()

      if (neighborhoodCounts && neighborhoodCounts.length > 0) {
        neighborhoodCounts.forEach((neighborhood: any) => {
          expect(neighborhood.id).toBeDefined()
          expect(neighborhood.name).toBeDefined()
          expect(neighborhood.properties).toBeDefined()

          // Properties count should be reasonable (not negative, not extremely high)
          const propertyCount = neighborhood.properties[0]?.count || 0
          expect(propertyCount).toBeGreaterThanOrEqual(0)
          expect(propertyCount).toBeLessThan(500) // Reasonable upper bound
        })
      }
    }, 15000)

    test('should validate cross-table data consistency', async () => {
      // Check that all neighborhood_id references in properties exist in neighborhoods
      const { data: orphanedProperties, error: orphanError } = await supabase
        .from('properties')
        .select('id, address, neighborhood_id')
        .not('neighborhood_id', 'is', null)
        .eq('is_active', true)
        .limit(50)

      expect(orphanError).toBeNull()

      if (orphanedProperties && orphanedProperties.length > 0) {
        // Verify all referenced neighborhoods exist
        const neighborhoodIds = [
          ...new Set(orphanedProperties.map((p: any) => p.neighborhood_id)),
        ]

        const { data: existingNeighborhoods, error: neighError } =
          await supabase
            .from('neighborhoods')
            .select('id')
            .in('id', neighborhoodIds)

        expect(neighError).toBeNull()
        expect(existingNeighborhoods).toBeDefined()

        const existingIds = existingNeighborhoods?.map((n: any) => n.id) || []

        // All referenced neighborhood IDs should exist
        neighborhoodIds.forEach((id) => {
          expect(existingIds).toContain(id)
        })
      }
    }, 15000)
  })

  describe('User-Property Interactions with ML Scores', () => {
    test('should validate user profile creation and retrieval', async () => {
      // Use the dynamically fetched test user
      const testUserId = testUsers.user1.id

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', testUserId)
        .single()

      expect(error).toBeNull()
      expect(profile).toBeDefined()
      expect(profile.id).toBe(testUserId)
      // Profile created by trigger may have default values
      expect(profile.preferences).toBeDefined()
    }, 10000)

    test('should validate user-property interaction with ML score storage', async () => {
      // Use dynamic test data
      const testUserId = testUsers.user1.id

      // Create a test interaction with ML scores
      const { data: newInteraction, error: createError } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: testUserId,
          property_id: testPropertyId,
          interaction_type: 'view',
          score_data: {
            ml_score: 0.85,
            cold_start_score: 0.7,
            feature_importance: {
              price: 0.3,
              location: 0.4,
              size: 0.3,
            },
          },
        })
        .select()
        .single()

      expect(createError).toBeNull()
      expect(newInteraction).toBeDefined()
      expect(newInteraction.interaction_type).toBe('view')
      expect(newInteraction.score_data).toBeDefined()
      expect(newInteraction.score_data.ml_score).toBe(0.85)
      expect(newInteraction.score_data.cold_start_score).toBe(0.7)
      expect(newInteraction.score_data.feature_importance).toBeDefined()

      // Clean up
      await supabase
        .from('user_property_interactions')
        .delete()
        .eq('id', newInteraction.id)
    }, 15000)

    test('should validate household functionality and collaboration', async () => {
      // Use dynamic test household
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('id', testHouseholdId)
        .single()

      expect(householdError).toBeNull()
      expect(household).toBeDefined()
      expect(household.name).toBe('Test Family')
      expect(household.collaboration_mode).toBe('shared')

      // Verify household-user relationships
      const { data: householdUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, household_id')
        .eq('household_id', testHouseholdId)

      expect(usersError).toBeNull()
      expect(householdUsers).toBeDefined()
      expect(householdUsers).toHaveLength(2) // Both test users in household
    }, 15000)

    test('should validate JSONB score_data field operations', async () => {
      // Create test interaction with complex JSONB data
      const testUserId = testUsers.user1.id

      const { data: interaction, error: createError } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: testUserId,
          property_id: testPropertyId,
          interaction_type: 'like',
          score_data: {
            ml_score: 0.92,
            lightgbm_score: 0.95,
            cold_start_score: 0.8,
            feature_importance: {
              price: 0.2,
              location: 0.5,
              size: 0.3,
            },
            model_version: 'v2.1.0',
            computed_at: new Date().toISOString(),
          },
        })
        .select()
        .single()

      expect(createError).toBeNull()
      expect(interaction).toBeDefined()
      expect(interaction.score_data).toBeDefined()

      // Verify complex JSONB structure
      expect(interaction.score_data.ml_score).toBe(0.92)
      expect(interaction.score_data.lightgbm_score).toBe(0.95)
      expect(interaction.score_data.feature_importance).toBeDefined()
      expect(interaction.score_data.feature_importance.price).toBe(0.2)
      expect(interaction.score_data.feature_importance.location).toBe(0.5)

      // Test JSONB querying capabilities
      const { data: jsonbFiltered, error: filterError } = await supabase
        .from('user_property_interactions')
        .select('id, score_data')
        .eq('score_data->>ml_score', '0.92')

      expect(filterError).toBeNull()
      expect(jsonbFiltered).toBeDefined()
      expect(jsonbFiltered.length).toBeGreaterThan(0)

      // Clean up
      await supabase
        .from('user_property_interactions')
        .delete()
        .eq('id', interaction.id)
    }, 15000)
  })

  describe('Transaction and Performance Tests', () => {
    test('should handle concurrent read operations', async () => {
      // Test concurrent reads on existing data
      const promises = [
        supabase.from('neighborhoods').select('*').limit(1),
        supabase.from('properties').select('*').limit(1),
        supabase.from('user_profiles').select('*').limit(1),
      ]

      const results = await Promise.all(promises)

      results.forEach((result) => {
        expect(result.error).toBeNull()
        expect(result.data).toBeDefined()
      })
    }, 10000)

    test('should validate database performance under load', async () => {
      const startTime = Date.now()

      // Perform multiple database operations
      const operations = [
        supabase
          .from('properties')
          .select('id, address, price')
          .eq('is_active', true)
          .limit(20),
        supabase.from('neighborhoods').select('id, name, city').limit(20),
        supabase
          .from('properties')
          .select('id, price, bedrooms, bathrooms')
          .gte('price', 500000)
          .eq('is_active', true)
          .limit(10),
      ]

      const results = await Promise.all(operations)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      // All operations should succeed
      results.forEach((result) => {
        expect(result.error).toBeNull()
        expect(result.data).toBeDefined()
      })

      // Total time should be reasonable (under 3 seconds for these operations)
      expect(totalTime).toBeLessThan(3000)
    }, 10000)

    test('should validate foreign key constraint enforcement', async () => {
      // Use dynamic test user
      const testUserId = testUsers.user1.id
      const nonExistentPropertyId = '00000000-0000-0000-0000-000000000000'

      // Try to create interaction with non-existent property (should fail)
      const { error: fkError } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: testUserId,
          property_id: nonExistentPropertyId,
          interaction_type: 'view',
        })

      // Should fail due to foreign key constraint
      expect(fkError).not.toBeNull()
      expect(fkError.message).toContain('violates foreign key constraint')
    }, 10000)
  })
})
