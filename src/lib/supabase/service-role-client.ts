import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import { SupabaseClientFactory } from '@/lib/supabase/factory'
import { ClientContext } from '@/lib/services/interfaces'

/**
 * Creates a Supabase client with the service role key.
 * Only use on the server for trusted operations.
 */
export async function getServiceRoleClient(): Promise<
  SupabaseClient<AppDatabase>
> {
  const factory = SupabaseClientFactory.getInstance()
  return factory.createClient({ context: ClientContext.SERVICE })
}
