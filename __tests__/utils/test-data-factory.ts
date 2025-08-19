/**
 * Test Data Factory for Integration Tests
 * Creates real database records for testing without mocks
 */
import { createClient } from '@/lib/supabase/standalone'
import { Database } from '@/types/database'
import { faker } from '@faker-js/faker'

type SupabaseClient = ReturnType<typeof createClient>

export class TestDataFactory {
  private client: SupabaseClient
  private createdRecords: { table: string; id: string }[] = []

  constructor(client?: SupabaseClient) {
    this.client = client || createClient()
  }

  /**
   * Track created records for cleanup
   */
  private trackRecord(table: string, id: string) {
    this.createdRecords.push({ table, id })
  }

  /**
   * Get existing test user (assumes users were created during test setup)
   * This method should only retrieve users, never create them
   */
  async getTestUser(email: string = 'test1@example.com') {
    try {
      // Get user profile directly from database using service role client
      // This avoids hitting the Auth API and works with predefined test users
      const { data: profile, error } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        throw new Error(
          `Test user profile for ${email} not found. Ensure test setup has run and user profiles were created by database triggers. Error: ${error.message}`
        )
      }

      if (process.env.DEBUG_TEST_FACTORY) {
        console.debug(`✅ Retrieved user profile for ${email}:`, profile.id)
      }

      return profile
    } catch (error: any) {
      // If direct profile lookup fails, provide helpful error message
      throw new Error(
        `Failed to get test user ${email}: ${error.message}. Make sure test setup (pnpm run test:integration) has created user profiles.`
      )
    }
  }

  /**
   * Create a test user with profile (fallback method)
   */
  async createUser(
    overrides: Partial<
      Database['public']['Tables']['user_profiles']['Insert']
    > = {}
  ) {
    // For integration tests, use existing test users
    const existingUsers = ['test1@example.com', 'test2@example.com']
    const randomEmail =
      existingUsers[Math.floor(Math.random() * existingUsers.length)]

    try {
      // Try to get an existing test user first
      const existingUser = await this.getTestUser(randomEmail)

      // Update with any overrides if needed
      if (
        Object.keys(overrides).length > 0 &&
        overrides.id !== existingUser.id
      ) {
        const { data, error } = await this.client
          .from('user_profiles')
          .update(overrides)
          .eq('id', existingUser.id)
          .select()
          .single()

        if (error) throw error
        return data
      }

      return existingUser
    } catch (_error) {
      // If test users don't exist, throw error (they should be created by setup script)
      throw new Error(
        'Test users not found. Run setup-test-users-admin.js first.'
      )
    }
  }

  /**
   * Create a test household with members
   */
  async createHousehold(
    memberIds: string[] = [],
    overrides: Partial<
      Database['public']['Tables']['households']['Insert']
    > = {}
  ) {
    const householdData = {
      id: faker.string.uuid(),
      name: faker.company.name() + ' Household',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      collaboration_mode: 'shared',
      ...overrides,
    }

    const { data: household, error: householdError } = await this.client
      .from('households')
      .insert(householdData)
      .select()
      .single()

    if (householdError) throw householdError
    if (!household) throw new Error('No data returned from household creation')
    this.trackRecord('households', household.id)

    // Add members to household
    for (const userId of memberIds) {
      await this.client
        .from('user_profiles')
        .update({ household_id: household.id })
        .eq('id', userId)
    }

    return household
  }

  /**
   * Create a test property
   */
  async createProperty(
    overrides: Partial<
      Database['public']['Tables']['properties']['Insert']
    > = {}
  ) {
    const propertyData = {
      id: faker.string.uuid(),
      zpid: faker.number.int({ min: 10000000, max: 99999999 }).toString(),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode(),
      price: faker.number.int({ min: 100000, max: 2000000 }),
      bedrooms: faker.number.int({ min: 1, max: 5 }),
      bathrooms: faker.number.float({ min: 1, max: 4, fractionDigits: 1 }),
      square_feet: faker.number.int({ min: 500, max: 5000 }),
      property_type: faker.helpers.arrayElement([
        'house',
        'condo',
        'townhouse',
      ]),
      listing_status: faker.helpers.arrayElement(['active', 'pending', 'sold']),
      year_built: faker.number.int({ min: 1950, max: 2024 }),
      lot_size_sqft: faker.number.int({ min: 1000, max: 20000 }),
      parking_spots: faker.number.int({ min: 0, max: 4 }),
      images: [faker.image.urlLoremFlickr({ category: 'house' })],
      description: faker.lorem.paragraph(),
      // Note: coordinates field removed as it causes GeoJSON type errors
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    }

    const { data, error } = await this.client
      .from('properties')
      .insert(propertyData)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('No data returned from property creation')
    this.trackRecord('properties', data.id)
    return data
  }

  /**
   * Create a user interaction (like/dislike)
   */
  async createInteraction(
    userId: string,
    propertyId: string,
    type: 'like' | 'dislike' | 'save',
    overrides: Partial<
      Database['public']['Tables']['user_property_interactions']['Insert']
    > = {}
  ) {
    // Wait briefly to ensure auth user and triggers have processed
    if (process.env.DEBUG_TEST_FACTORY) {
      console.debug(
        `🔍 Ensuring user ${userId} exists in user_profiles before creating interaction`
      )
    }

    // Simple verification that user_profile exists (auth.users FK constraint will be enforced)
    let userExists = false
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data } = await this.client
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (data) {
        userExists = true
        if (process.env.DEBUG_TEST_FACTORY && attempt > 0) {
          console.debug(
            `✅ User ${userId} found in user_profiles after ${attempt + 1} attempts`
          )
        }
        break
      }

      if (attempt < 4) {
        // Brief retry for user_profiles since they may be created by trigger
        const delay = 100 * Math.pow(2, attempt)
        if (process.env.DEBUG_TEST_FACTORY) {
          console.debug(
            `🔄 User ${userId} not found in user_profiles, retrying in ${delay}ms (attempt ${attempt + 1}/5)`
          )
        }
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    if (!userExists) {
      throw new Error(
        `User ${userId} not found in user_profiles after 5 attempts`
      )
    }

    // Also verify property exists on current connection (for property_id foreign key)
    let propertyExists = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data } = await this.client
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .single()

      if (data) {
        propertyExists = data
        if (process.env.DEBUG_TEST_FACTORY && attempt > 0) {
          console.debug(
            `✅ Property ${propertyId} found on connection after ${attempt + 1} attempts`
          )
        }
        break
      }

      if (attempt < 4) {
        // Shorter retry for properties since they're created in the same session
        const delay = 25 * Math.pow(2, attempt)
        if (process.env.DEBUG_TEST_FACTORY) {
          console.debug(
            `🔄 Property ${propertyId} not visible on connection, retrying in ${delay}ms (attempt ${attempt + 1}/5)`
          )
        }
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    if (!propertyExists) {
      throw new Error(
        `Property ${propertyId} not visible on current connection after 5 attempts`
      )
    }

    // Get the user's household_id for proper couples functionality
    const { data: userProfile } = await this.client
      .from('user_profiles')
      .select('household_id')
      .eq('id', userId)
      .single()

    // Check if interaction already exists to avoid duplicates
    const { data: existing } = await this.client
      .from('user_property_interactions')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .eq('interaction_type', type)
      .single()

    if (existing) {
      if (process.env.DEBUG_TEST_FACTORY) {
        console.debug(
          `⚠️  Interaction already exists: ${userId} ${type} ${propertyId}`
        )
      }
      this.trackRecord('user_property_interactions', existing.id)
      return existing
    }

    const interactionData = {
      id: faker.string.uuid(),
      user_id: userId,
      property_id: propertyId,
      interaction_type: type,
      household_id: userProfile?.household_id || null,
      score_data: {},
      created_at: new Date().toISOString(),
      ...overrides,
    }

    if (process.env.DEBUG_TEST_FACTORY) {
      console.debug(
        `🎯 Creating interaction: ${userId} ${type} ${propertyId} (household: ${interactionData.household_id})`
      )
    }

    const { data, error } = await this.client
      .from('user_property_interactions')
      .insert(interactionData)
      .select()
      .single()

    if (error) {
      console.error(`❌ Failed to create interaction:`, {
        error: error.message,
        code: error.code,
        details: error.details,
        userId,
        propertyId,
        type,
        householdId: interactionData.household_id,
      })
      throw error
    }
    if (!data) throw new Error('No data returned from interaction creation')

    if (process.env.DEBUG_TEST_FACTORY) {
      console.debug(
        `✅ Created interaction: ${userId} ${type} ${propertyId} (household: ${interactionData.household_id})`
      )
    }

    this.trackRecord('user_property_interactions', data.id)
    return data
  }

  /**
   * Create a couples scenario with mutual likes
   */
  async createCouplesScenario() {
    // Use existing test users
    const user1 = await this.getTestUser('test1@example.com')
    const user2 = await this.getTestUser('test2@example.com')

    // Wait briefly to ensure user profiles exist before proceeding
    await new Promise((resolve) => setTimeout(resolve, 200))

    // Create a household with both users
    const household = await this.createHousehold([user1.id, user2.id])

    // Create properties
    const property1 = await this.createProperty()
    const property2 = await this.createProperty()
    const property3 = await this.createProperty()

    // Create mutual likes (both users like property1)
    await this.createInteraction(user1.id, property1.id, 'like')
    await this.createInteraction(user2.id, property1.id, 'like')

    // Create individual likes
    await this.createInteraction(user1.id, property2.id, 'like')
    await this.createInteraction(user2.id, property3.id, 'like')

    // Create a dislike
    await this.createInteraction(user1.id, property3.id, 'dislike')

    return {
      users: [user1, user2],
      household,
      properties: [property1, property2, property3],
      mutualLikes: [property1],
    }
  }

  /**
   * Create properties with geographic distribution
   */
  async createGeographicProperties(
    count: number = 10,
    centerLat?: number,
    centerLng?: number
  ) {
    const _lat = centerLat || 40.7128 // Default to NYC
    const _lng = centerLng || -74.006

    const properties = []
    for (let i = 0; i < count; i++) {
      // Create properties within ~10 mile radius
      const property = await this.createProperty({
        // Note: coordinates field removed as it causes GeoJSON type errors
        // Properties will use default coordinates from createProperty
      })
      properties.push(property)
    }

    return properties
  }

  /**
   * Clean up all created test data
   * Note: We don't clean up auth.users - use auth.admin.deleteUser() if needed
   */
  async cleanup() {
    // Delete in reverse order to handle foreign key constraints
    const tables = [
      'user_property_interactions',
      'properties',
      'households',
      'user_profiles',
    ]

    for (const table of tables) {
      const recordsToDelete = this.createdRecords
        .filter((r) => r.table === table)
        .map((r) => r.id)

      if (recordsToDelete.length > 0) {
        await (this.client as any)
          .from(table)
          .delete()
          .in('id', recordsToDelete)
      }
    }

    this.createdRecords = []
  }

  /**
   * Create test data for ML scoring scenarios
   */
  async createMLScoringScenario() {
    // Use existing test user
    const user = await this.getTestUser('test1@example.com')

    // Update preferences if needed
    await this.client
      .from('user_profiles')
      .update({
        preferences: {
          min_price: 300000,
          max_price: 600000,
          min_bedrooms: 2,
          max_bedrooms: 4,
          preferred_cities: ['Seattle', 'Bellevue'],
        } as any,
      })
      .eq('id', user.id)

    // Create properties with varying match scores
    const perfectMatch = await this.createProperty({
      price: 450000,
      bedrooms: 3,
      city: 'Seattle',
    })

    const goodMatch = await this.createProperty({
      price: 550000,
      bedrooms: 3,
      city: 'Bellevue',
    })

    const poorMatch = await this.createProperty({
      price: 800000,
      bedrooms: 5,
      city: 'Tacoma',
    })

    // Create interaction history for ML training
    await this.createInteraction(user.id, perfectMatch.id, 'like')
    await this.createInteraction(user.id, goodMatch.id, 'like')
    await this.createInteraction(user.id, poorMatch.id, 'dislike')

    return {
      user,
      properties: [perfectMatch, goodMatch, poorMatch],
    }
  }
}

// Singleton instance for easy test cleanup
let globalFactory: TestDataFactory | null = null

export function getTestDataFactory(client?: SupabaseClient): TestDataFactory {
  if (!globalFactory) {
    globalFactory = new TestDataFactory(client)
  }
  return globalFactory
}

export async function cleanupAllTestData() {
  if (globalFactory) {
    await globalFactory.cleanup()
    globalFactory = null
  }
}
