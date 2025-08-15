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
   * Get existing test user by email (from setup-test-users-admin.js)
   */
  async getTestUser(email: string = 'test1@example.com') {
    // First find the auth user by email
    const { data: users } = await this.client.auth.admin.listUsers()
    const authUser = users?.users?.find(u => u.email === email)
    
    if (!authUser) {
      throw new Error(`Test user ${email} not found. Run setup-test-users-admin.js first.`)
    }

    // Then get their profile from user_profiles table
    const { data: profile, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error) {
      // Return basic user info if profile doesn't exist
      return { id: authUser.id, email: authUser.email }
    }
    
    return { ...profile, email: authUser.email }
  }

  /**
   * Create a test user with profile (fallback method)
   */
  async createUser(overrides: Partial<Database['public']['Tables']['user_profiles']['Insert']> = {}) {
    const userData = {
      id: faker.string.uuid(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      onboarding_completed: false,
      preferences: {},
      ...overrides,
    }

    const { data, error } = await this.client
      .from('user_profiles')
      .insert(userData)
      .select()
      .single()

    if (error) throw error
    this.trackRecord('user_profiles', data.id)
    return data
  }

  /**
   * Create a test household with members
   */
  async createHousehold(memberIds: string[] = [], overrides: Partial<Database['public']['Tables']['households']['Insert']> = {}) {
    const householdData = {
      id: faker.string.uuid(),
      name: faker.company.name() + ' Household',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      collaboration_mode: 'collaborative',
      ...overrides,
    }

    const { data: household, error: householdError } = await this.client
      .from('households')
      .insert(householdData)
      .select()
      .single()

    if (householdError) throw householdError
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
  async createProperty(overrides: Partial<Database['public']['Tables']['properties']['Insert']> = {}) {
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
      property_type: faker.helpers.arrayElement(['SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE']),
      listing_status: faker.helpers.arrayElement(['FOR_SALE', 'FOR_RENT', 'SOLD']),
      year_built: faker.number.int({ min: 1950, max: 2024 }),
      lot_size_sqft: faker.number.int({ min: 1000, max: 20000 }),
      parking_spots: faker.number.int({ min: 0, max: 4 }),
      images: [faker.image.urlLoremFlickr({ category: 'house' })],
      description: faker.lorem.paragraph(),
      coordinates: { lat: faker.location.latitude(), lng: faker.location.longitude() },
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
    overrides: Partial<Database['public']['Tables']['user_property_interactions']['Insert']> = {}
  ) {
    const interactionData = {
      id: faker.string.uuid(),
      user_id: userId,
      property_id: propertyId,
      interaction_type: type,
      interaction_metadata: {},
      created_at: new Date().toISOString(),
      ...overrides,
    }

    const { data, error } = await this.client
      .from('user_property_interactions')
      .insert(interactionData)
      .select()
      .single()

    if (error) throw error
    this.trackRecord('user_property_interactions', data.id)
    return data
  }

  /**
   * Create a couples scenario with mutual likes
   */
  async createCouplesScenario() {
    // Create two users
    const user1 = await this.createUser()
    const user2 = await this.createUser()

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
  async createGeographicProperties(count: number = 10, centerLat?: number, centerLng?: number) {
    const lat = centerLat || 40.7128 // Default to NYC
    const lng = centerLng || -74.0060

    const properties = []
    for (let i = 0; i < count; i++) {
      // Create properties within ~10 mile radius
      const property = await this.createProperty({
        // Using coordinates field instead of latitude/longitude
        coordinates: { lat: lat + (Math.random() - 0.5) * 0.2, lng: lng + (Math.random() - 0.5) * 0.2 },
      } as any)
      properties.push(property)
    }

    return properties
  }

  /**
   * Clean up all created test data
   */
  async cleanup() {
    // Delete in reverse order to handle foreign key constraints
    const tables = ['user_property_interactions', 'properties', 'households', 'user_profiles']
    
    for (const table of tables) {
      const recordsToDelete = this.createdRecords
        .filter(r => r.table === table)
        .map(r => r.id)

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
    const user = await this.createUser({
      preferences: {
        min_price: 300000,
        max_price: 600000,
        min_bedrooms: 2,
        max_bedrooms: 4,
        preferred_cities: ['Seattle', 'Bellevue'],
      } as any,
    })

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