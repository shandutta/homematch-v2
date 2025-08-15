/**
 * Database fixtures for integration tests
 * These functions setup and cleanup test database state
 */
import { createClient } from '@/lib/supabase/standalone'
import { cleanupAllTestData } from '../utils/test-data-factory'

let supabaseClient: ReturnType<typeof createClient> | null = null

/**
 * Setup test database with clean state
 */
export async function setupTestDatabase() {
  try {
    // Create Supabase client for tests
    supabaseClient = createClient()
    
    // Verify connection
    const { data: _data, error } = await supabaseClient
      .from('user_profiles')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.warn('Database connection check failed:', error.message)
    }
    
    console.log('✅ Test database connection established')
    return supabaseClient
  } catch (error) {
    console.error('❌ Failed to setup test database:', error)
    throw error
  }
}

/**
 * Cleanup test database - remove test data
 */
export async function cleanupTestDatabase() {
  try {
    // Clean up test data factory records
    await cleanupAllTestData()
    
    console.log('✅ Test database cleaned up')
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error)
    // Don't throw - cleanup should be best effort
  }
}

/**
 * Get test database client
 */
export function getTestDatabaseClient() {
  if (!supabaseClient) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.')
  }
  return supabaseClient
}

/**
 * Reset test database to clean state
 */
export async function resetTestDatabase() {
  await cleanupTestDatabase()
  await setupTestDatabase()
}