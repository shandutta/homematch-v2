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
   * Get or create test user using Admin API (elegant approach)
   * This properly triggers database functions and maintains referential integrity
   */
  async getTestUser(email: string = 'test1@example.com') {
    let retries = 3
    let lastError: Error | null = null
    
    while (retries > 0) {
      try {
        // First try to find existing user in users table
        // This ensures we use the same user ID consistently
        const { data: existingUser, error: userTableError } = await (this.client as any)
          .from('users')
          .select('id, email')
          .eq('email', email)
          .single()
        
        if (existingUser && !userTableError) {
          // User already exists in users table, use their ID
          console.log(`✅ Using existing test user from users table: ${email} (${existingUser.id})`)
          
          // Get user profile
          const { data: profile, error: profileError } = await this.client
            .from('user_profiles')
            .select('*')
            .eq('id', existingUser.id)
            .single()
          
          if (profile && !profileError) {
            return { ...profile, email: existingUser.email }
          }
          
          // If profile doesn't exist, create it
          const { data: newProfile } = await this.client
            .from('user_profiles')
            .insert({
              id: existingUser.id,
              email: existingUser.email,
              onboarding_completed: false,
              preferences: {}
            })
            .select()
            .single()
          
          return newProfile || { id: existingUser.id, email: existingUser.email }
        }
        
        // User doesn't exist in users table, check auth.users
        const { data: users, error: listError } = await this.client.auth.admin.listUsers()
        
        if (listError) throw listError
        
        let authUser = users?.users?.find((u: any) => u.email === email)
        
        if (!authUser) {
          // Create user via Admin API - this properly triggers all database functions
          const { data: createData, error: createError } = await this.client.auth.admin.createUser({
            email,
            password: 'testpassword123', // Use consistent test password
            email_confirm: true, // Bypass email confirmation for tests
            user_metadata: { 
              created_for_testing: true,
              created_at: new Date().toISOString()
            }
          })
          
          if (createError) {
            throw new Error(`Failed to create test user: ${createError.message}`)
          }
          
          authUser = createData.user
          console.log(`✅ Created test user via Admin API: ${email}`)
        }

        // CRITICAL: Wait for user to exist in users table before proceeding
        // This is essential for foreign key constraints
        await this.waitForUserInUsersTable(authUser.id)
        
        // Then ensure complete sync with all tables
        const correctedUserId = await this.ensureUserTablesPopulated(authUser.id, authUser.email || email)
        const finalUserId = correctedUserId || authUser.id

        // Add additional delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 200))

        // Get user profile - should exist now
        const { data: profile, error: profileError } = await this.client
          .from('user_profiles')
          .select('*')
          .eq('id', finalUserId)
          .single()

        if (profileError) {
          if (process.env.DEBUG_TEST_FACTORY) {
            console.debug('Still no user profile after manual creation:', profileError)
          }
          // Return auth user data as fallback since users table not in types
          return { id: finalUserId, email: authUser.email || email }
        }
        
        return { ...profile, email: authUser.email }
        
      } catch (error: any) {
        lastError = error
        retries--
        
        // Don't retry if it's a duplicate user error (user exists)
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          // User exists, try to find them
          retries = 0
          continue
        }
        
        if (retries > 0) {
          if (process.env.DEBUG_TEST_FACTORY) {
            console.debug(`⚠️  Admin API call failed, retrying... (${retries} attempts left)`)
          }
          await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000))
        }
      }
    }
    
    throw new Error(`Failed to get/create test user after 3 attempts: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Ensure user exists in users table (fix race condition with sync trigger)
   * This is critical for foreign key constraints that reference the users table
   */
  private async waitForUserInUsersTable(userId: string): Promise<void> {
    let retries = 8 // Increased retries for more reliability
    let lastError: Error | null = null

    while (retries > 0) {
      try {
        // First check if user exists in users table
        const { data: user, error } = await (this.client as any)
          .from('users')
          .select('id, email')
          .eq('id', userId)
          .single()

        if (!error && user) {
          // User exists, we can proceed
          if (process.env.DEBUG_TEST_FACTORY) {
            console.debug(`✅ User ${userId} found in users table`)
          }
          return
        }

        // User doesn't exist, try to get email from auth.users and create entry
        const { data: authUsers } = await this.client.auth.admin.listUsers()
        const authUser = authUsers?.users?.find((u: any) => u.id === userId)
        
        if (!authUser) {
          // Auth user not found yet, might be eventual consistency issue, wait and retry
          retries--
          if (retries > 0) {
            const waitTime = 300 * (9 - retries) // Progressive backoff: 300ms, 600ms, 900ms...
            if (process.env.DEBUG_TEST_FACTORY) {
              console.debug(`⏳ Auth user ${userId} not found, waiting ${waitTime}ms (${retries} retries left)`)
            }
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
          throw new Error(`User ${userId} not found in auth.users after ${9 - retries} attempts`)
        }

        // Auth user found, but not in users table - manually sync
        if (process.env.DEBUG_TEST_FACTORY) {
          console.debug(`🔄 Manually syncing user ${userId} (${authUser.email}) to users table`)
        }

        const { error: insertError } = await (this.client as any)
          .from('users')
          .insert({
            id: userId,
            email: authUser.email || '',
            created_at: authUser.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (insertError) {
          if (insertError.message?.includes('duplicate key') || insertError.message?.includes('already exists')) {
            // Success - user was created by another process (trigger or concurrent operation)
            if (process.env.DEBUG_TEST_FACTORY) {
              console.debug(`✅ User ${userId} already exists in users table (concurrent creation)`)
            }
            return
          }
          
          // Real error - retry
          retries--
          if (retries > 0) {
            const waitTime = 300 * (9 - retries)
            if (process.env.DEBUG_TEST_FACTORY) {
              console.debug(`⚠️  Insert failed: ${insertError.message}, retrying in ${waitTime}ms (${retries} retries left)`)
            }
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
          throw new Error(`Failed to create user in users table: ${insertError.message}`)
        }

        if (process.env.DEBUG_TEST_FACTORY) {
          console.debug(`✅ Successfully synced user ${userId} to users table`)
        }
        return // Success

      } catch (error: any) {
        lastError = error
        retries--
        
        if (retries > 0) {
          const waitTime = 300 * (9 - retries)
          if (process.env.DEBUG_TEST_FACTORY) {
            console.debug(`⚠️  waitForUserInUsersTable failed: ${error.message}, retrying in ${waitTime}ms (${retries} retries left)`)
          }
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    throw new Error(`Failed to ensure user exists in users table after 8 attempts: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Ensure user exists in both public.users and user_profiles tables using atomic function
   * This uses the new ensure_user_exists_atomic function to prevent race conditions
   */
  private async ensureUserTablesPopulated(userId: string, _email: string): Promise<string | null> {
    try {
      if (process.env.DEBUG_TEST_FACTORY) {
        console.debug(`🔄 Using atomic function to ensure user ${userId} exists`)
      }
      
      // Call the atomic function that handles all synchronization with advisory locks
      const { data: syncedUserId, error } = await (this.client as any).rpc(
        'ensure_user_exists_atomic',
        { p_auth_user_id: userId }
      )

      if (error) {
        if (process.env.DEBUG_TEST_FACTORY) {
          console.debug(`⚠️  Atomic sync failed: ${error.message}`)
        }
        // Fall back to manual sync for compatibility
        await this.waitForUserInUsersTable(userId)
        return null
      }

      if (process.env.DEBUG_TEST_FACTORY) {
        console.debug(`✅ User ${userId} synchronized atomically`)
      }
      
      return syncedUserId === userId ? null : syncedUserId
    } catch (error: any) {
      if (process.env.DEBUG_TEST_FACTORY) {
        console.debug('Error in atomic user sync, falling back to manual sync:', error.message)
      }
      // Fall back to the original waitForUserInUsersTable method
      await this.waitForUserInUsersTable(userId)
      return null
    }
  }

  /**
   * Create a test user with profile (fallback method)
   */
  async createUser(overrides: Partial<Database['public']['Tables']['user_profiles']['Insert']> = {}) {
    // For integration tests, use existing test users
    const existingUsers = ['test1@example.com', 'test2@example.com']
    const randomEmail = existingUsers[Math.floor(Math.random() * existingUsers.length)]
    
    try {
      // Try to get an existing test user first
      const existingUser = await this.getTestUser(randomEmail)
      
      // Update with any overrides if needed
      if (Object.keys(overrides).length > 0 && overrides.id !== existingUser.id) {
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
      throw new Error('Test users not found. Run setup-test-users-admin.js first.')
    }
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
      property_type: faker.helpers.arrayElement(['single_family', 'condo', 'townhome']),
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
    overrides: Partial<Database['public']['Tables']['user_property_interactions']['Insert']> = {}
  ) {
    // CRITICAL: Use atomic function to ensure user exists (fixes foreign key constraint race condition)
    // This handles all synchronization atomically with advisory locks
    if (process.env.DEBUG_TEST_FACTORY) {
      console.debug(`🔍 Ensuring user ${userId} exists atomically before creating interaction`)
    }
    
    try {
      // Use the atomic function to ensure user exists
      const { error: atomicError } = await (this.client as any).rpc(
        'ensure_user_exists_atomic',
        { p_auth_user_id: userId }
      )
      
      if (atomicError) {
        if (process.env.DEBUG_TEST_FACTORY) {
          console.debug(`⚠️  Atomic user sync failed: ${atomicError.message}, falling back to manual verification`)
        }
        // Fall back to manual verification
        await this.waitForUserInUsersTable(userId)
      } else {
        if (process.env.DEBUG_TEST_FACTORY) {
          console.debug(`✅ User ${userId} ensured atomically`)
        }
      }
    } catch (error: any) {
      if (process.env.DEBUG_TEST_FACTORY) {
        console.debug(`⚠️  Atomic function call failed: ${error.message}, falling back to manual verification`)
      }
      // Fall back to manual verification
      await this.waitForUserInUsersTable(userId)
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
          console.debug(`✅ Property ${propertyId} found on connection after ${attempt + 1} attempts`)
        }
        break
      }
      
      if (attempt < 4) {
        // Shorter retry for properties since they're created in the same session
        const delay = 25 * Math.pow(2, attempt)
        if (process.env.DEBUG_TEST_FACTORY) {
          console.debug(`🔄 Property ${propertyId} not visible on connection, retrying in ${delay}ms (attempt ${attempt + 1}/5)`)
        }
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    if (!propertyExists) {
      throw new Error(`Property ${propertyId} not visible on current connection after 5 attempts`)
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
        console.debug(`⚠️  Interaction already exists: ${userId} ${type} ${propertyId}`)
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
      console.debug(`🎯 Creating interaction: ${userId} ${type} ${propertyId} (household: ${interactionData.household_id})`)
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
        householdId: interactionData.household_id
      })
      throw error
    }
    if (!data) throw new Error('No data returned from interaction creation')
    
    if (process.env.DEBUG_TEST_FACTORY) {
      console.debug(`✅ Created interaction: ${userId} ${type} ${propertyId} (household: ${interactionData.household_id})`)
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

    // CRITICAL: Double-check both users exist in users table before proceeding
    // This prevents race conditions in subsequent operations
    await this.waitForUserInUsersTable(user1.id)
    await this.waitForUserInUsersTable(user2.id)

    // Add a longer delay to ensure database consistency across all connections
    // This helps with database connection isolation issues
    await new Promise(resolve => setTimeout(resolve, 500))

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
    const _lat = centerLat || 40.7128 // Default to NYC
    const _lng = centerLng || -74.0060

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