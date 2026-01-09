import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'

// Cache clients per unique URL/key to avoid multiple GoTrue instances in tests
const cachedTestClients = new Map<string, SupabaseClient<AppDatabase>>()

/**
 * Create a standalone Supabase client for scripts and migrations
 * This doesn't require Next.js context (cookies, etc.)
 */
export function createClient(
  overrideUrl?: string,
  overrideServiceKey?: string
): SupabaseClient<AppDatabase> {
  const supabaseUrl =
    overrideUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL
  const supabaseServiceKey =
    overrideServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  if (process.env.NODE_ENV === 'test') {
    const cacheKey = `${supabaseUrl}:${supabaseServiceKey}`
    if (!cachedTestClients.has(cacheKey)) {
      cachedTestClients.set(
        cacheKey,
        createSupabaseClient<AppDatabase>(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            // Avoid shared auth storage collisions in vitest/jsdom
            storage: undefined,
            storageKey: `supabase-test-${process.env.VITEST_POOL_ID || '1'}-${supabaseServiceKey.slice(0, 6)}`,
          },
        })
      )
    }
    return cachedTestClients.get(cacheKey)!
  }

  return createSupabaseClient<AppDatabase>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Export alias for migration script compatibility
export { createClient as createStandaloneClient }
