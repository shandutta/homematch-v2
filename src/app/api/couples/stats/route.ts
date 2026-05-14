import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { requireUserFromRequest } from '@/lib/api/auth'
import { CouplesService } from '@/lib/services/couples'
import { noStoreJson } from '@/lib/api/cache-control'
import { ApiErrorHandler } from '@/lib/api/errors'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    const auth = await requireUserFromRequest(supabase, request)
    if (!auth.user) return auth.response
    const { user } = auth

    // @service-role-capability: Phase 5 — same RLS-deny problem as
    // /api/couples/mutual-likes (CouplesService.getUserHousehold reads
    // user_profiles, the activity/stats paths read user_property_interactions
    // and households). Verified Clerk session above; pass service-role
    // client scoped via user.id.
    // TODO(D1 follow-up): replace with a constrained
    // get_household_stats_for_user_id RPC.
    const readClient = await getServiceRoleClient({
      approvedCapability: 'clerk-couples-read',
    })

    // Get household statistics
    const stats = await CouplesService.getHouseholdStats(readClient, user.id)

    if (!stats) {
      return ApiErrorHandler.notFound(
        'Household not found or no statistics available'
      )
    }

    return noStoreJson({ stats })
  } catch (error) {
    console.error('Error in couples stats API:', error)
    return ApiErrorHandler.serverError(
      'Failed to fetch household statistics',
      error
    )
  }
}
