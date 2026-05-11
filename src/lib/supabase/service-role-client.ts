import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import {
  createServiceClient,
  type ApprovedServiceRoleCapability,
} from '@/lib/supabase/server'

interface GetServiceRoleClientOptions {
  approvedCapability?: ApprovedServiceRoleCapability
}

/**
 * Creates a Supabase client with the service role key.
 * Only use on the server for trusted operations after the shared service-role
 * authorization gate passes. Accepts an optional `approvedCapability` to
 * bypass the admin role check for repo-approved use cases like webhooks.
 */
export async function getServiceRoleClient(
  options: GetServiceRoleClientOptions = {}
): Promise<SupabaseClient<AppDatabase>> {
  return createServiceClient(options)
}
