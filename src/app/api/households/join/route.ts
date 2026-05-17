/* eslint-disable @typescript-eslint/consistent-type-assertions */
// @service-role-capability: Clerk-aware household join. The caller's Clerk
// session is verified via requireUserFromRequest, then the service-role client
// updates only that resolved user_profiles row.
// D1 done: service-role is scoped to the verified profile UUID and is required
// because Clerk-authenticated requests cannot use auth.uid()-based RLS.
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

const PROFILE_SELECT =
  'clerk_user_id, created_at, display_name, email, household_id, id, onboarding_completed, preferences, updated_at'

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
      rateLimitKey('households:join', userId)
    )
    if (rateLimitResponse) return rateLimitResponse

    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      return ApiErrorHandler.badRequest('Invalid or missing JSON body', error)
    }

    const householdId =
      body && typeof body === 'object' && 'household_id' in body
        ? (body as { household_id?: unknown }).household_id
        : null

    if (typeof householdId !== 'string' || !UUID_PATTERN.test(householdId)) {
      return ApiErrorHandler.badRequest('Invalid household_id')
    }

    const sr = await getServiceRoleClient({
      approvedCapability: 'clerk-household-write',
    })

    const { data: existingProfile, error: existingProfileError } = await sr
      .from('user_profiles')
      .select(PROFILE_SELECT)
      .eq('id', userId)
      .maybeSingle()

    if (existingProfileError || !existingProfile) {
      console.error(
        '[/api/households/join POST] Profile read failed:',
        existingProfileError
      )
      return ApiErrorHandler.serverError(
        'Failed to load your profile before joining',
        existingProfileError ?? new Error('profile not found')
      )
    }

    if (existingProfile.household_id) {
      if (existingProfile.household_id === householdId) {
        return noStoreJson({ profile: existingProfile })
      }
      return ApiErrorHandler.badRequest(
        'You already belong to a household. Leave it before joining another.'
      )
    }

    const { data: household, error: householdError } = await sr
      .from('households')
      .select('id')
      .eq('id', householdId)
      .maybeSingle()

    if (householdError || !household) {
      return ApiErrorHandler.badRequest('Household not found')
    }

    const { data: updatedProfile, error: updateProfileError } = await sr
      .from('user_profiles')
      .update({ household_id: householdId })
      .eq('id', userId)
      .select(PROFILE_SELECT)
      .maybeSingle()

    if (updateProfileError || !updatedProfile) {
      console.error(
        '[/api/households/join POST] Profile update failed:',
        updateProfileError
      )
      return ApiErrorHandler.serverError(
        'Failed to join household',
        updateProfileError ?? new Error('updated profile not returned')
      )
    }

    return noStoreJson({ profile: updatedProfile })
  } catch (err) {
    console.error('[/api/households/join POST] Unexpected error:', err)
    return ApiErrorHandler.serverError('Failed to join household', err)
  }
}
