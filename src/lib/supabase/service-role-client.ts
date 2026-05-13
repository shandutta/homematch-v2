import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import {
  createServiceClient,
  type ApprovedServiceRoleCapability,
} from '@/lib/supabase/server'

interface GetServiceRoleClientOptions {
  approvedCapability: ApprovedServiceRoleCapability
}

/**
 * Returns a Supabase client backed by the service-role key.
 *
 * A3 (2026-05-13 audit): `approvedCapability` is required at the type
 * level AND verified against an allowlist in `createServiceClient`. Every
 * call site declares the gate it operates under; new code can't silently
 * acquire RLS-bypassing access.
 */
export async function getServiceRoleClient(
  options: GetServiceRoleClientOptions
): Promise<SupabaseClient<AppDatabase>> {
  return createServiceClient(options)
}
