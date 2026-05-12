import { auth, currentUser } from '@clerk/nextjs/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { resolveUserProfileIdFromClerkId } from '@/lib/auth/profile'

/**
 * Just-in-time user_profiles row creation for Clerk-authenticated users.
 *
 * The Clerk webhook at /api/webhooks/clerk creates the profile on `user.created`,
 * but Clerk can redirect the user into the app before that webhook completes.
 * This helper closes the race: any server-side caller that needs a profile UUID
 * can ask for one, and we'll create it if missing.
 *
 * The webhook remains the canonical source — both paths upsert keyed by
 * clerk_user_id, so a webhook arrival after this fallback is a no-op (or an
 * email/display_name refresh).
 *
 * @returns the profile UUID, or null if there is no Clerk session
 */
export async function ensureUserProfileForCurrentClerkUser(): Promise<
  string | null
> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  const existing = await resolveUserProfileIdFromClerkId(clerkUserId)
  if (existing) return existing

  // No row yet — create one. Pull the freshest user data from Clerk so we
  // don't insert an unknown@... placeholder unnecessarily.
  let email: string | null = null
  let displayName: string | null = null
  try {
    const clerkUser = await currentUser()
    const primary = clerkUser?.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )
    email =
      primary?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress ??
      null
    const parts = [clerkUser?.firstName, clerkUser?.lastName].filter(
      (v): v is string => typeof v === 'string' && v.length > 0
    )
    displayName = parts.length ? parts.join(' ') : (clerkUser?.username ?? null)
  } catch (e) {
    console.warn(
      '[ensureUserProfileForCurrentClerkUser] currentUser() failed:',
      e
    )
  }

  const supabase = await getServiceRoleClient({
    approvedCapability: 'clerk-profile-bootstrap',
  })

  // Re-check under the service-role client in case a parallel request just
  // inserted the row — avoids the rare double-insert collision on clerk_user_id.
  const { data: raceCheck } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()
  if (raceCheck?.id) return raceCheck.id

  const newProfileId = crypto.randomUUID()
  const placeholderEmail = `unknown+${clerkUserId}@clerk-webhook.invalid`
  const { error } = await supabase.from('user_profiles').insert({
    id: newProfileId,
    clerk_user_id: clerkUserId,
    email: email ?? placeholderEmail,
    display_name: displayName,
    onboarding_completed: false,
    preferences: {},
  })

  if (error) {
    // 23505 = unique_violation. A concurrent insert won — re-read.
    if (error.code === '23505') {
      const { data: winner } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle()
      if (winner?.id) return winner.id
    }
    console.error(
      '[ensureUserProfileForCurrentClerkUser] insert failed:',
      error
    )
    return null
  }

  return newProfileId
}
