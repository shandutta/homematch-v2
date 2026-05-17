/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Casts: create_household_by_user_id is a new RPC added by the
// 20260513030000_household_001 migration; supabase-js types haven't been
// regenerated yet, so we cast the rpc call site rather than block the fix
// on a full regenerate.
// @service-role-capability: Clerk-aware household creation; verifies the
// Clerk session via requireUserFromRequest, then calls the
// create_household_by_user_id RPC under service-role with the resolved
// user_profiles.id. Service-role usage is bounded to the row the verified
// Clerk session attests to.
// TODO(D1 follow-up): replace with a fully Clerk-aware Supabase JWT setup
// so the RPC can read auth.uid() directly and we can drop the service-role
// wrapper entirely.
/**
 * POST /api/households — create a household for the current Clerk-authenticated user.
 *
 * Closes HOUSEHOLD-001: the original UserServiceClient.createHousehold() path
 * called Supabase RPC create_household_for_user(TEXT) directly from the anon
 * client. The RPC reads auth.uid() / auth.users, both of which are unavailable
 * for Clerk sessions, so every Clerk user hit "Not authenticated" 400s and the
 * entire matching feature was unreachable in prod.
 *
 * This route verifies the Clerk session via requireUserFromRequest,
 * bootstraps a user_profiles row if the webhook hasn't fired yet, then calls
 * the new Clerk-aware RPC create_household_by_user_id(UUID, TEXT) through a
 * service-role client. The service-role client is gated by an approved
 * capability so it can't be abused.
 */
import { NextRequest } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { requireUserFromRequest } from '@/lib/api/auth'
import { ApiErrorHandler } from '@/lib/api/errors'
import { ensureUserProfileForCurrentClerkUser } from '@/lib/auth/ensure-profile'
import { noStoreJson } from '@/lib/api/cache-control'
import { checkRateLimit, rateLimitKey } from '@/lib/middleware/rateLimiter'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isLikelyClerkUserId = (id: string) =>
  id.startsWith('user_') && !UUID_PATTERN.test(id)

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient(request)
    const { user, response } = await requireUserFromRequest(supabase, request)

    if (!user || response) {
      return response ?? ApiErrorHandler.unauthorized()
    }

    let userId = user.id
    if (isLikelyClerkUserId(userId)) {
      const bootstrapped = await ensureUserProfileForCurrentClerkUser()
      if (!bootstrapped) {
        return ApiErrorHandler.serverError(
          'Failed to bootstrap user profile',
          new Error('ensure-profile returned null')
        )
      }
      userId = bootstrapped
    }

    if (isLikelyClerkUserId(userId)) {
      return ApiErrorHandler.unauthorized()
    }

    const rateLimitResponse = await checkRateLimit(
      rateLimitKey('households:create', userId)
    )
    if (rateLimitResponse) return rateLimitResponse

    let body: unknown = null
    try {
      body = await request.json()
    } catch {
      // Empty body is fine — name is optional.
    }
    const name =
      body && typeof body === 'object' && body !== null && 'name' in body
        ? typeof (body as { name?: unknown }).name === 'string'
          ? (body as { name: string }).name.trim() || null
          : null
        : null

    const sr = await getServiceRoleClient({
      approvedCapability: 'clerk-household-write',
    })
    type CreateHouseholdRpc = (
      fn: 'create_household_by_user_id',
      args: { p_user_id: string; p_name: string | null }
    ) => Promise<{
      data: string | null
      error: { message?: string; code?: string } | null
    }>
    const { data: householdId, error } = await (
      sr.rpc as unknown as CreateHouseholdRpc
    )('create_household_by_user_id', { p_user_id: userId, p_name: name })

    if (error) {
      console.error('[/api/households POST] RPC failed:', error)
      // Surface the user-friendly subset of RPC errors; mask the rest.
      if (error.message?.includes('already belongs to a household')) {
        return ApiErrorHandler.badRequest('User already belongs to a household')
      }
      return ApiErrorHandler.serverError('Failed to create household', error)
    }

    if (!householdId) {
      return ApiErrorHandler.serverError(
        'Failed to create household',
        new Error('RPC returned no household id')
      )
    }

    const { data: household, error: householdError } = await sr
      .from('households')
      .select(
        'collaboration_mode, created_at, created_by, id, name, updated_at, user_count'
      )
      .eq('id', householdId)
      .maybeSingle()

    if (householdError || !household) {
      console.error(
        '[/api/households POST] Created household read failed:',
        householdError
      )
      return ApiErrorHandler.serverError(
        'Failed to load created household',
        householdError ?? new Error('created household not found')
      )
    }

    return noStoreJson({ id: householdId, household })
  } catch (err) {
    console.error('[/api/households POST] Unexpected error:', err)
    return ApiErrorHandler.serverError('Failed to create household', err)
  }
}
