/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Casts: the Supabase JSON shape for the embedded household relationship
// is too loosely typed without the explicit cast to ProfileWithHousehold.
/**
 * Server-component-safe user_profiles reads for Clerk-authenticated users.
 *
 * Background (PROD-RLS-001):
 * - Server components access Supabase via the anon-key `createClient()`
 *   helper, which has no propagated Clerk session.
 * - RLS on `user_profiles` requires `auth.uid() = id`. With the anon-key
 *   client, `auth.uid()` is null, so SELECT returns 0 rows for every Clerk
 *   user — even ones with valid profile rows in the DB.
 * - API routes work because they use `createApiClient(request)`, which
 *   propagates the Clerk session. Server components can't access the
 *   request directly, so that path is unavailable to them.
 *
 * Resolution:
 * - Callers verify the Clerk session via `auth()` first, then use the
 *   service-role client with the `clerk-profile-read` capability for the
 *   actual SELECT.
 * - The bypass is scoped to "the row the user's own verified Clerk session
 *   attests to" — keyed by `clerk_user_id` or by the resolved `user_profiles.id`
 *   for callers that already hold the UUID.
 *
 * Use these helpers from server components and server actions instead of
 * the anon-client paths (`UserService.getUserProfileWithHousehold`,
 * `resolveUserProfileIdFromClerkId`) when reading the current user's profile.
 */
import type { Household, UserProfile } from '@/types/database'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'

// Embed disambiguator (`!household_id`): Phase 6 added a second FK between
// user_profiles and households (households.created_by → user_profiles.id),
// and PostgREST returns "more than one relationship was found" if you don't
// say which FK to traverse. Pinning to the household_id column keeps the
// embed pointed at the user's own household.
const PROFILE_SELECT =
  'clerk_user_id, created_at, display_name, email, household_id, id, onboarding_completed, preferences, updated_at, household:households!household_id(collaboration_mode, created_at, created_by, id, name, updated_at, user_count)'

type ProfileWithHousehold = UserProfile & { household?: Household | null }

/**
 * Resolve a Clerk userId to a `user_profiles.id` (UUID). Service-role-backed
 * so it sees rows the anon client can't.
 *
 * The caller MUST verify the Clerk session first (e.g. via `auth()` in
 * `@clerk/nextjs/server`). The `clerkUserId` value should come from that
 * verified session.
 */
async function _lookupProfileIdByClerkUserId(
  clerkUserId: string
): Promise<string | null> {
  try {
    const supabase = await getServiceRoleClient({
      approvedCapability: 'clerk-profile-read',
    })
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle()

    if (error) {
      console.warn(
        '[lookupProfileIdByClerkUserId] service-role lookup failed:',
        error.message
      )
      return null
    }

    return data?.id ?? null
  } catch (e) {
    console.warn('[lookupProfileIdByClerkUserId] unexpected error:', e)
    return null
  }
}

/**
 * Read the current user's full profile (with household join) for
 * server-component rendering. Service-role-backed read scoped to the
 * profile UUID the caller already holds.
 *
 * Returns null if the row doesn't exist (e.g. transitional state between
 * Clerk sign-up and webhook/bootstrap completion). Callers should render a
 * graceful "setting up your profile" state when this happens.
 *
 * @param profileId user_profiles.id (UUID) — resolved via
 *   `lookupProfileIdByClerkUserId` or `ensureUserProfileForCurrentClerkUser`
 */
export async function getUserProfileForServerAuth(
  profileId: string
): Promise<ProfileWithHousehold | null> {
  try {
    const supabase = await getServiceRoleClient({
      approvedCapability: 'clerk-profile-read',
    })
    const { data, error } = await supabase
      .from('user_profiles')
      .select(PROFILE_SELECT)
      .eq('id', profileId)
      .maybeSingle()

    if (error) {
      console.warn(
        '[getUserProfileForServerAuth] service-role lookup failed:',
        error.message
      )
      return null
    }

    return (data as ProfileWithHousehold | null) ?? null
  } catch (e) {
    console.warn('[getUserProfileForServerAuth] unexpected error:', e)
    return null
  }
}
