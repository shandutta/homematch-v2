// @service-role-capability: Clerk-aware household invitation creation;
// verifies the Clerk session, confirms the caller belongs to the named
// household, then inserts the invitation row under service-role. Bounded
// to the household the verified Clerk session is a member of.
// TODO(D1 follow-up): replace with a fully Clerk-aware Supabase JWT setup
// so the household_invitations RLS policies can directly recognize the
// caller and we can drop the service-role wrapper entirely.
/**
 * POST /api/households/invitations — create a household invitation as the
 * currently-authenticated Clerk user.
 *
 * Replaces the broken UserServiceClient.createHouseholdInvitation() path,
 * which called supabase.auth.getSession() (null for Clerk users) and then
 * INSERTed via the anon-key client (RLS blocks Clerk users from writing to
 * household_invitations).
 *
 * This route verifies the Clerk session, resolves the user_profiles.id,
 * confirms the user belongs to the household named in the body, then
 * inserts the invitation via service-role.
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

const INVITE_TTL_DAYS = 7

interface InvitationRequestBody {
  household_id?: string
  invited_email?: string
  invited_name?: string
  message?: string
}

const isInvitationBody = (value: unknown): value is InvitationRequestBody =>
  typeof value === 'object' && value !== null

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
      rateLimitKey('households:invitation', userId)
    )
    if (rateLimitResponse) return rateLimitResponse

    let raw: unknown = null
    try {
      raw = await request.json()
    } catch {
      return ApiErrorHandler.badRequest('Invalid or missing JSON body')
    }
    if (!isInvitationBody(raw) || !raw.household_id) {
      return ApiErrorHandler.badRequest('household_id is required')
    }
    if (!UUID_PATTERN.test(raw.household_id)) {
      return ApiErrorHandler.badRequest('household_id must be a UUID')
    }

    const sr = await getServiceRoleClient({
      approvedCapability: 'clerk-household-write',
    })

    // Verify the caller actually belongs to this household.
    const { data: profile, error: profileError } = await sr
      .from('user_profiles')
      .select('household_id')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      return ApiErrorHandler.serverError('Profile lookup failed', profileError)
    }
    if (!profile?.household_id) {
      return ApiErrorHandler.badRequest(
        'You need to join a household before sending invites'
      )
    }
    if (profile.household_id !== raw.household_id) {
      return ApiErrorHandler.badRequest(
        'You can only send invites for your own household'
      )
    }

    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString()
    const token = crypto.randomUUID()

    const { data: invitation, error: insertError } = await sr
      .from('household_invitations')
      .insert({
        household_id: raw.household_id,
        created_by: userId,
        token,
        invited_email:
          typeof raw.invited_email === 'string'
            ? raw.invited_email.trim().toLowerCase()
            : null,
        invited_name:
          typeof raw.invited_name === 'string' ? raw.invited_name : null,
        message: typeof raw.message === 'string' ? raw.message : null,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (insertError) {
      return ApiErrorHandler.serverError(
        'Failed to create invitation',
        insertError
      )
    }

    return noStoreJson({ invitation })
  } catch (err) {
    console.error('[/api/households/invitations POST] Unexpected error:', err)
    return ApiErrorHandler.serverError('Failed to create invitation', err)
  }
}
