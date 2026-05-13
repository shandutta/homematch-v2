import { auth, currentUser } from '@clerk/nextjs/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { resolveUserProfileIdFromClerkId } from '@/lib/auth/profile'
import { deriveDisplayNameFromEmail } from '@/lib/auth/display-name'

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

  // No row yet — create one. Pull the freshest user data from Clerk so the
  // insert has a real email and display name.
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
    // Fallback chain: firstName+lastName -> firstName -> lastName ->
    // username (legacy users with Clerk's Username field) -> email
    // local-part. The email fallback covers USERNAME-DROP: once the
    // Clerk dashboard toggle is flipped, new users won't have a
    // username, but the email local-part still produces a sensible
    // display string (avoids the avatar showing "?" / email prefix
    // bug from the audit's Section 6 P2 finding).
    displayName =
      parts.length > 0
        ? parts.join(' ')
        : (clerkUser?.username ?? deriveDisplayNameFromEmail(email))
  } catch (e) {
    console.warn(
      '[ensureUserProfileForCurrentClerkUser] currentUser() failed:',
      e
    )
  }

  // /review M2: fail-closed if Clerk doesn't surface an email. The
  // previous behavior wrote `unknown+<id>@clerk-webhook.invalid` so the
  // insert satisfied a (now-relaxed) NOT NULL constraint, but transactional
  // senders reading user_profiles.email between bootstrap and webhook
  // arrival would hard-bounce. The webhook itself is idempotent and will
  // populate the row when a real email lands — returning null here just
  // means the caller falls through to its "no profile yet" branch one more
  // request, which is much better than poisoning the row with a dead
  // address.
  if (!email) {
    console.warn(
      '[ensureUserProfileForCurrentClerkUser] no email on Clerk user; ' +
        'deferring bootstrap to webhook to avoid a placeholder address'
    )
    return null
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
  const { error } = await supabase.from('user_profiles').insert({
    id: newProfileId,
    clerk_user_id: clerkUserId,
    email,
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
