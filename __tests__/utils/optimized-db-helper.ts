/**
 * Optimized Database Helper for Integration Tests
 *
 * Implements efficient database management patterns:
 * - Connection pooling and reuse
 * - Bulk operations with transactions
 * - Targeted cleanup instead of full resets
 * - Test isolation without expensive recreation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createClient as createStandaloneClient } from '@/lib/supabase/standalone'

interface OptimizedTestSession {
  serviceClient: SupabaseClient
  userClients: Map<string, SupabaseClient>
  testData: {
    households: string[]
    properties: string[]
    interactions: string[]
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export class OptimizedDatabaseHelper {
  private static instance: OptimizedDatabaseHelper
  private session: OptimizedTestSession | null = null
  private initialized = false

  private constructor() {}

  static getInstance(): OptimizedDatabaseHelper {
    if (!OptimizedDatabaseHelper.instance) {
      OptimizedDatabaseHelper.instance = new OptimizedDatabaseHelper()
    }
    return OptimizedDatabaseHelper.instance
  }

  /**
   * Initialize database session with connection pooling
   * Called once per test suite, not per test
   */
  async initializeSession(): Promise<void> {
    if (this.initialized && this.session) {
      return // Reuse existing session
    }

    this.session = {
      serviceClient: createStandaloneClient(),
      userClients: new Map(),
      testData: {
        households: [],
        properties: [],
        interactions: [],
      },
    }

    // Verify test users exist without recreating
    await this.verifyTestUsers()
    this.initialized = true
  }

  /**
   * Get pooled authenticated client for user
   * Reuses existing connections instead of creating new ones
   */
  async getAuthenticatedClient(
    email: string,
    password: string = 'testpassword123'
  ): Promise<SupabaseClient> {
    if (!this.session) {
      throw new Error(
        'Database session not initialized. Call initializeSession() first.'
      )
    }

    // Return existing client if already authenticated
    if (this.session.userClients.has(email)) {
      const client = this.session.userClients.get(email)!

      // Verify session is still valid
      const {
        data: { session },
      } = await client.auth.getSession()
      if (session) {
        return client
      }

      // Session expired, re-authenticate
      this.session.userClients.delete(email)
    }

    // Create new authenticated client
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54200'
    const supabaseKey = process.env.SUPABASE_ANON_KEY || null

    if (!supabaseKey) {
      throw new Error(
        'Missing SUPABASE_ANON_KEY for optimized DB helper. Populate via .env.test.local or .env.prod.'
      )
    }

    const client = createClient(supabaseUrl, supabaseKey)

    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(`Failed to authenticate as ${email}: ${error.message}`)
    }

    this.session.userClients.set(email, client)
    return client
  }

  /**
   * Get service client for administrative operations
   */
  getServiceClient(): SupabaseClient {
    if (!this.session) {
      throw new Error(
        'Database session not initialized. Call initializeSession() first.'
      )
    }
    return this.session.serviceClient
  }

  /**
   * Bulk insert operations with transaction support
   */
  async bulkInsertWithTracking(
    table: string,
    data: Array<Record<string, unknown>>,
    trackingCategory: keyof OptimizedTestSession['testData']
  ): Promise<Array<Record<string, unknown> & { id: string }>> {
    if (!this.session) {
      throw new Error('Database session not initialized')
    }

    const { data: insertedData, error } = await this.session.serviceClient
      .from(table)
      .insert(data)
      .select()

    if (error) {
      throw new Error(`Bulk insert failed for ${table}: ${error.message}`)
    }

    if (!insertedData) {
      throw new Error(`No data returned from ${table} insert`)
    }

    const records: Array<Record<string, unknown> & { id: string }> = []
    for (const item of insertedData) {
      if (!isRecord(item) || typeof item.id !== 'string') {
        throw new Error(`Inserted ${table} row is missing an id`)
      }
      records.push({ ...item, id: item.id })
    }

    // Track inserted IDs for efficient cleanup
    const ids = records.map((item) => item.id)
    this.session.testData[trackingCategory].push(...ids)

    return records
  }

  /**
   * Create test household with optimized operations
   */
  async createTestHousehold(
    name: string,
    userEmails: string[]
  ): Promise<{ id: string; members: Array<{ id: string; email: string }> }> {
    if (!this.session) {
      throw new Error('Database session not initialized')
    }

    // Get user IDs in single query
    const { data: users, error: userError } =
      await this.session.serviceClient.auth.admin.listUsers()
    if (userError) {
      throw new Error(`Failed to get users: ${userError.message}`)
    }

    const userIds = userEmails.map((email) => {
      const user = users.users.find((u) => u.email === email)
      if (!user) {
        throw new Error(`User ${email} not found`)
      }
      return user.id
    })

    // Create household
    const [household] = await this.bulkInsertWithTracking(
      'households',
      [{ name }],
      'households'
    )

    // Bulk update user profiles
    const { error: profileError } = await this.session.serviceClient
      .from('user_profiles')
      .update({ household_id: household.id })
      .in('id', userIds)

    if (profileError) {
      throw new Error(
        `Failed to link users to household: ${profileError.message}`
      )
    }

    return {
      id: household.id,
      members: userIds.map((id, index) => ({ id, email: userEmails[index] })),
    }
  }

  /**
   * Efficient targeted cleanup instead of full reset
   * Only cleans data created during current test session
   */
  async cleanupTestData(): Promise<void> {
    if (!this.session) {
      return
    }

    const { serviceClient, testData } = this.session

    // Bulk delete in dependency order (interactions -> properties -> households)
    const cleanupOperations = [
      { table: 'user_property_interactions', ids: testData.interactions },
      { table: 'properties', ids: testData.properties },
      { table: 'households', ids: testData.households },
    ]

    for (const { table, ids } of cleanupOperations) {
      if (ids.length > 0) {
        const { error } = await serviceClient.from(table).delete().in('id', ids)

        if (error) {
          console.warn(`Failed to cleanup ${table}:`, error.message)
        }
      }
    }

    // Reset tracking arrays
    testData.interactions = []
    testData.properties = []
    testData.households = []

    // Reset household associations for test users
    await this.resetTestUserHouseholds()
  }

  /**
   * Close all connections and cleanup session
   */
  async closeSession(): Promise<void> {
    if (!this.session) {
      return
    }

    // Sign out all user clients
    for (const [email, client] of this.session.userClients) {
      try {
        await client.auth.signOut({ scope: 'local' })
      } catch (error) {
        console.warn(`Failed to sign out ${email}:`, error)
      }
    }

    this.session.userClients.clear()
    this.session = null
    this.initialized = false
  }

  /**
   * Verify test users exist without expensive recreation
   */
  private async verifyTestUsers(): Promise<void> {
    if (!this.session) {
      throw new Error('Session not initialized')
    }

    const requiredEmails = ['test1@example.com', 'test2@example.com']

    const { data: users, error } =
      await this.session.serviceClient.auth.admin.listUsers()
    if (error) {
      throw new Error(`Failed to verify test users: ${error.message}`)
    }

    const existingEmails = users.users.map((u) => u.email)
    const missingUsers = requiredEmails.filter(
      (email) => !existingEmails.includes(email)
    )

    if (missingUsers.length > 0) {
      throw new Error(
        `Missing test users: ${missingUsers.join(', ')}. ` +
          'Run "node scripts/setup-test-users-admin.js" to create them.'
      )
    }
  }

  /**
   * Reset test user household associations efficiently
   */
  private async resetTestUserHouseholds(): Promise<void> {
    if (!this.session) {
      return
    }

    const testUserEmails = ['test1@example.com', 'test2@example.com']

    // Get test user IDs
    const { data: users } =
      await this.session.serviceClient.auth.admin.listUsers()
    const testUserIds =
      users?.users
        ?.filter((u) => testUserEmails.includes(u.email!))
        ?.map((u) => u.id) || []

    if (testUserIds.length > 0) {
      await this.session.serviceClient
        .from('user_profiles')
        .update({ household_id: null })
        .in('id', testUserIds)
    }
  }
}

// Export singleton instance
export const optimizedDbHelper = OptimizedDatabaseHelper.getInstance()
