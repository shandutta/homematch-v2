import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Creates a Supabase client with the service role key.
 * Only use on the server for trusted operations after the shared service-role
 * authorization gate passes.
 */
export async function getServiceRoleClient(): Promise<
  SupabaseClient<AppDatabase>
> {
  return createServiceClient()
}
