/**
 * Database Test Helpers for Integration Testing
 * Provides transaction support and database utilities
 */
import { createClient } from '@/lib/supabase/standalone'
import { TestDataFactory } from './test-data-factory'

type SupabaseClient = ReturnType<typeof createClient>

/**
 * Run a test within a database transaction that automatically rolls back
 * Note: Requires custom RPC functions in Supabase
 */
export async function withTransaction<T>(
  testFn: (client: SupabaseClient, factory: TestDataFactory) => Promise<T>
): Promise<T> {
  const client = createClient()
  const factory = new TestDataFactory(client)

  try {
    // For now, we'll use manual cleanup instead of transactions
    // Real transaction support would require custom RPC functions
    const result = await testFn(client, factory)
    return result
  } finally {
    // Clean up any test data created
    await factory.cleanup()
  }
}

/**
 * Reset database to a known state for testing
 */
export async function resetTestDatabase() {
  const client = createClient()

  // Clear test data in order (respecting foreign keys)
  const tables = [
    'user_property_interactions',
    'saved_searches',
    'properties',
    'households',
    'user_profiles',
  ]

  for (const table of tables) {
    // Only delete test data (e.g., emails ending with .test)
    if (table === 'user_profiles') {
      await client.from(table).delete().eq('id', 'test-user-id') // Adjust cleanup logic as needed
    } else {
      // For other tables, you might want more specific cleanup logic
      // This is a placeholder - adjust based on your needs
    }
  }
}

/**
 * Wait for database changes to propagate (for eventual consistency)
 */
export async function waitForDatabase(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create a test database client with specific user authentication
 */
export async function createAuthenticatedClient(
  _userId: string
): Promise<SupabaseClient> {
  // This would normally create a client with a specific user's JWT
  // For testing, we'll use the service role client
  const client = createClient()

  // You could enhance this to actually create JWTs for testing
  // For now, it returns the standard client
  return client
}

/**
 * Database query helpers for common test scenarios
 */
export class TestDatabaseQueries {
  constructor(private client: SupabaseClient) {}

  /**
   * Get all interactions for a user
   */
  async getUserInteractions(userId: string) {
    const { data, error } = await this.client
      .from('user_property_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Get mutual likes for a household
   */
  async getHouseholdMutualLikes(householdId: string) {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('id')
      .eq('household_id', householdId)

    if (error) throw error
    const userIds = data.map((m) => m.id)

    // Get properties liked by all users
    const { data: interactions, error: interactionError } = await this.client
      .from('user_property_interactions')
      .select('property_id, user_id')
      .in('user_id', userIds)
      .eq('interaction_type', 'like')

    if (interactionError) throw interactionError

    // Group by property and count unique users
    const propertyLikes = new Map<string, Set<string>>()
    interactions.forEach((i) => {
      if (!propertyLikes.has(i.property_id)) {
        propertyLikes.set(i.property_id, new Set())
      }
      propertyLikes.get(i.property_id)!.add(i.user_id)
    })

    // Find properties liked by all users
    const mutualLikes = Array.from(propertyLikes.entries())
      .filter(([_, users]) => users.size === userIds.length)
      .map(([propertyId]) => propertyId)

    return mutualLikes
  }

  /**
   * Get properties within a geographic radius
   */
  async getPropertiesNearLocation(
    lat: number,
    lng: number,
    radiusMiles: number = 10
  ) {
    // Using PostGIS functions via RPC
    const { data, error } = await (this.client as any).rpc(
      'get_properties_within_radius',
      {
        center_lat: lat,
        center_lng: lng,
        radius_miles: radiusMiles,
      }
    )

    if (error) {
      // Fallback to basic lat/lng filtering if RPC doesn't exist
      const radiusDegrees = radiusMiles / 69 // Rough conversion
      const { data: fallbackData, error: fallbackError } = await this.client
        .from('properties')
        .select('*')
        .gte('latitude', lat - radiusDegrees)
        .lte('latitude', lat + radiusDegrees)
        .gte('longitude', lng - radiusDegrees)
        .lte('longitude', lng + radiusDegrees)

      if (fallbackError) throw fallbackError
      return fallbackData
    }

    return data
  }

  /**
   * Verify database constraints
   */
  async verifyConstraints() {
    const violations = []

    // Check for orphaned records
    const { data: orphanedInteractions } = await this.client
      .from('user_property_interactions')
      .select('id, user_id')
      .is('user_id', null)

    if (orphanedInteractions?.length) {
      violations.push({
        type: 'orphaned_records',
        table: 'user_property_interactions',
        count: orphanedInteractions.length,
      })
    }

    // Check for duplicate household members
    const { data: householdMembers } = await this.client
      .from('user_profiles')
      .select('household_id, id')

    const seen = new Set<string>()
    const duplicates = []
    householdMembers?.forEach((m) => {
      const key = `${m.household_id}-${m.id}`
      if (seen.has(key)) {
        duplicates.push(key)
      }
      seen.add(key)
    })

    if (duplicates.length) {
      violations.push({
        type: 'duplicate_records',
        table: 'user_profiles',
        count: duplicates.length,
      })
    }

    return violations
  }
}

/**
 * Test database assertion helpers
 */
export class TestDatabaseAssertions {
  constructor(private client: SupabaseClient) {}

  /**
   * Assert that a record exists in the database
   */
  async assertExists(table: string, conditions: Record<string, any>) {
    let query = (this.client as any).from(table).select('id')

    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { data, error } = await query.single()

    if (error || !data) {
      throw new Error(
        `Expected record in ${table} with conditions ${JSON.stringify(conditions)} to exist`
      )
    }

    return true
  }

  /**
   * Assert that a record does not exist
   */
  async assertNotExists(table: string, conditions: Record<string, any>) {
    let query = (this.client as any).from(table).select('id')

    Object.entries(conditions).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { data } = await query

    if (data && data.length > 0) {
      throw new Error(
        `Expected no records in ${table} with conditions ${JSON.stringify(conditions)}`
      )
    }

    return true
  }

  /**
   * Assert record count matches expected
   */
  async assertCount(
    table: string,
    expectedCount: number,
    conditions?: Record<string, any>
  ) {
    let query = (this.client as any)
      .from(table)
      .select('id', { count: 'exact' })

    if (conditions) {
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data: _data, count, error } = await query

    if (error) throw error

    if (count !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} records in ${table}, but found ${count}`
      )
    }

    return true
  }
}
