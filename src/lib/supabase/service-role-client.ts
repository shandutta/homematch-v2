import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { SupabaseClientFactory } from '@/lib/supabase/factory'
import { ClientContext } from '@/lib/services/interfaces'

/**
 * Creates a Supabase client with the service role key.
 * Only use on the server for trusted operations.
 */
export async function getServiceRoleClient(): Promise<
  SupabaseClient<Database>
> {
  const factory = SupabaseClientFactory.getInstance()
  return factory.createClient({ context: ClientContext.SERVICE })
}
