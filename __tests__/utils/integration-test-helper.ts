/**
 * Integration Test Helper
 *
 * Provides utilities for setting up test data with proper RLS handling.
 * Uses service role client for data setup to bypass RLS restrictions,
 * then returns authenticated client for actual testing.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createClient as createStandaloneClient } from '@/lib/supabase/standalone'

interface TestUser {
  id: string
  email: string
  password?: string
}

interface TestHousehold {
  id: string
  name: string
  members: TestUser[]
}

export class IntegrationTestHelper {
  private serviceClient: SupabaseClient
  private authenticatedClient: SupabaseClient | null = null
  private currentUser: TestUser | null = null
  private cleanupTasks: Array<() => Promise<void>> = []

  constructor() {
    // Service role client bypasses ALL RLS policies - use for data setup
    this.serviceClient = createStandaloneClient()
  }

  /**
   * Get the service role client for administrative operations
   * WARNING: This bypasses ALL RLS policies - use only for test setup/teardown
   */
  getServiceClient(): SupabaseClient {
    return this.serviceClient
  }

  /**
   * Get the authenticated client for testing user operations
   * This respects RLS policies as a normal user would experience
   */
  getAuthenticatedClient(): SupabaseClient | null {
    return this.authenticatedClient
  }

  /**
   * Register a cleanup task to be run during teardown
   */
  registerCleanup(task: () => Promise<void>) {
    this.cleanupTasks.push(task)
  }

  /**
   * Creates an authenticated client for the given user
   * This client respects RLS policies and should be used for actual API testing
   */
  async authenticateAs(
    email: string,
    password: string
  ): Promise<SupabaseClient> {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
    const supabaseKey =
      process.env.SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJb-Uo4x3ZZKdl7AhVOMi9CgqZCL-QPBQ'

    this.authenticatedClient = createClient(supabaseUrl, supabaseKey)

    const { data, error } =
      await this.authenticatedClient.auth.signInWithPassword({
        email,
        password,
      })

    if (error) {
      throw new Error(`Failed to authenticate as ${email}: ${error.message}`)
    }

    this.currentUser = {
      id: data.user!.id,
      email: data.user!.email!,
    }

    return this.authenticatedClient
  }

  /**
   * Sets up a household with multiple users
   * Uses service role to bypass RLS for setup
   */
  async setupHousehold(householdData: {
    name: string
    userIds: string[]
  }): Promise<TestHousehold> {
    // Create household using service role
    const { data: household, error: householdError } = await this.serviceClient
      .from('households')
      .insert({ name: householdData.name })
      .select()
      .single()

    if (householdError) {
      throw new Error(`Failed to create household: ${householdError.message}`)
    }

    // Update user profiles to link them to the household
    const { error: profileError } = await this.serviceClient
      .from('user_profiles')
      .update({ household_id: household.id })
      .in('id', householdData.userIds)

    if (profileError) {
      throw new Error(
        `Failed to link users to household: ${profileError.message}`
      )
    }

    // Get user details
    const { data: profiles } = await this.serviceClient
      .from('user_profiles')
      .select('id')
      .eq('household_id', household.id)

    const members = profiles?.map((p) => ({ id: p.id, email: '' })) || []

    return {
      id: household.id,
      name: household.name,
      members,
    }
  }

  /**
   * Inserts properties using service role to bypass RLS
   */
  async insertProperties(properties: any[]): Promise<void> {
    const { error } = await this.serviceClient
      .from('properties')
      .upsert(properties)

    if (error) {
      throw new Error(`Failed to insert properties: ${error.message}`)
    }
  }

  /**
   * Inserts user-property interactions using service role to bypass RLS
   */
  async insertInteractions(interactions: any[]): Promise<void> {
    const { error } = await this.serviceClient
      .from('user_property_interactions')
      .upsert(interactions)

    if (error) {
      throw new Error(`Failed to insert interactions: ${error.message}`)
    }
  }

  /**
   * Gets test users that were created by setup-test-users-admin.js
   */
  async getTestUser(email: string): Promise<TestUser> {
    const { data: users, error } =
      await this.serviceClient.auth.admin.listUsers()

    if (error) {
      throw new Error(`Failed to list users: ${error.message}`)
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      throw new Error(
        `Test user ${email} not found. Run setup-test-users-admin.js first.`
      )
    }

    return {
      id: user.id,
      email: user.email!,
    }
  }

  /**
   * Cleans up test data after tests complete
   * Runs all registered cleanup tasks plus default cleanup
   */
  async cleanup(options?: {
    deleteInteractions?: boolean
    deleteProperties?: boolean
    deleteHouseholds?: boolean
  }): Promise<void> {
    const opts = {
      deleteInteractions: true,
      deleteProperties: true,
      deleteHouseholds: true,
      ...options,
    }

    // Run custom cleanup tasks first
    for (const task of this.cleanupTasks) {
      try {
        await task()
      } catch (error) {
        console.warn('Cleanup task failed:', error)
      }
    }
    this.cleanupTasks = []

    // Default cleanup
    if (opts.deleteInteractions && this.currentUser) {
      await this.serviceClient
        .from('user_property_interactions')
        .delete()
        .eq('user_id', this.currentUser.id)
    }

    // Sign out if authenticated
    if (this.authenticatedClient) {
      await this.authenticatedClient.auth.signOut()
      this.authenticatedClient = null
      this.currentUser = null
    }
  }
}

// Export singleton instance for convenience
export const testHelper = new IntegrationTestHelper()
