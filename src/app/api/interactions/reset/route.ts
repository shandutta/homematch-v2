import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { ApiErrorHandler } from '@/lib/api/errors'
import { checkRateLimit, rateLimitKey } from '@/lib/middleware/rateLimiter'
import { CouplesService } from '@/lib/services/couples'
import { requireUserFromRequest } from '@/lib/api/auth'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { user, response } = await requireUserFromRequest(supabase, request)

    if (!user || response) {
      return response ?? ApiErrorHandler.unauthorized()
    }

    // Rate limiting - use stricter rate limit for destructive operations
    const rateLimitResponse = await checkRateLimit(
      rateLimitKey('interactions:reset', user.id)
    )
    if (rateLimitResponse) return rateLimitResponse

    // @service-role-capability: Phase 5 dropped the user_property_interactions
    // self-write policy. Clerk users hold no Supabase session anyway. Delete
    // under service-role with explicit user_id WHERE — same pattern as the
    // single-property /api/interactions DELETE.
    // TODO(D1 follow-up): replace with a constrained
    // reset_user_interactions_for_user_id RPC.
    const writeClient = await getServiceRoleClient({
      approvedCapability: 'clerk-interactions-write',
    })

    // Delete all interactions for this user
    // Add timeout to prevent hanging
    const deletePromise = writeClient
      .from('user_property_interactions')
      .delete()
      .eq('user_id', user.id)
      .select('id, household_id')

    type DeleteResult = Awaited<typeof deletePromise>

    const timeoutPromise: Promise<DeleteResult> = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Reset interactions timed out')), 10000)
    )

    let deletedRows: DeleteResult['data']
    let error: DeleteResult['error']
    try {
      const result = await Promise.race([deletePromise, timeoutPromise])
      deletedRows = result.data
      error = result.error
    } catch (e) {
      console.error('Reset interactions timed out or failed:', e)
      return ApiErrorHandler.serverError(
        'Failed to reset interactions (timeout)',
        e
      )
    }

    if (error) {
      console.error('[Interactions RESET] Error:', error)
      return ApiErrorHandler.serverError('Failed to reset interactions', error)
    }

    const householdIdsToClear = new Set(
      (deletedRows ?? [])
        .map((row) => row.household_id)
        .filter((id): id is string => Boolean(id))
    )
    householdIdsToClear.forEach((id) => CouplesService.clearHouseholdCache(id))

    return ApiErrorHandler.success({
      deleted: true,
      count: deletedRows?.length ?? 0,
    })
  } catch (err) {
    console.error('[Interactions RESET] Unexpected error:', err)
    return ApiErrorHandler.serverError('Failed to reset interactions', err)
  }
}
