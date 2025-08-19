/**
 * Test Client Factory for Integration Tests
 *
 * Provides a consistent client factory that uses the service role key
 * to bypass RLS policies during testing. This allows integration tests
 * to create data without authentication context issues.
 */

import { createClient } from '@/lib/supabase/standalone'
import type { ISupabaseClientFactory } from '@/lib/services/interfaces'

/**
 * Test client factory that returns the service role client
 * This bypasses ALL RLS policies - use only for testing
 */
export class TestSupabaseClientFactory implements ISupabaseClientFactory {
  private client = createClient()

  async createClient() {
    return this.client
  }
}

/**
 * Create a simple client factory object for use in tests
 * This is a lighter-weight alternative to the class above
 */
export function createTestClientFactory() {
  const client = createClient()
  return {
    createClient: async () => client,
  }
}

/**
 * Singleton instance for tests that need consistent client reuse
 */
let singletonFactory: TestSupabaseClientFactory | null = null

export function getTestClientFactory(): TestSupabaseClientFactory {
  if (!singletonFactory) {
    singletonFactory = new TestSupabaseClientFactory()
  }
  return singletonFactory
}
