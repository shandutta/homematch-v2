import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { ApiErrorHandler } from '@/lib/api/errors'
import { checkRateLimit, rateLimitKey } from '@/lib/middleware/rateLimiter'
import { CouplesService } from '@/lib/services/couples'
import { requireUserFromRequest } from '@/lib/api/auth'

type DeletedRow = { deleted_household_id: string | null }

const isDeletedRow = (value: unknown): value is DeletedRow =>
  typeof value === 'object' && value !== null && 'deleted_household_id' in value

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

    // @service-role-capability: Phase 5 dropped the
    // user_property_interactions self-write policy. Clerk users hold no
    // Supabase session anyway. D1 done: actual DELETE lives in
    // reset_user_interactions_for_user_id (SECURITY DEFINER) — we still
    // come in under service-role since the trust boundary is the Clerk
    // session verified above, not the DB-level authenticated grant.
    const writeClient = await getServiceRoleClient({
      approvedCapability: 'clerk-interactions-write',
    })

    // Delete all interactions for this user via the D1 RPC.
    // Add timeout to prevent hanging.
    const deletePromise = writeClient.rpc(
      'reset_user_interactions_for_user_id',
      { p_user_id: user.id }
    )

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

    const rows = Array.isArray(deletedRows)
      ? deletedRows.filter(isDeletedRow)
      : []

    const householdIdsToClear = new Set(
      rows
        .map((row) => row.deleted_household_id)
        .filter((id): id is string => Boolean(id))
    )
    householdIdsToClear.forEach((id) => CouplesService.clearHouseholdCache(id))

    return ApiErrorHandler.success({
      deleted: true,
      count: rows.length,
    })
  } catch (err) {
    console.error('[Interactions RESET] Unexpected error:', err)
    return ApiErrorHandler.serverError('Failed to reset interactions', err)
  }
}
