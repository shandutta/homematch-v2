/**
 * Phase C.2 helpers: bridge Clerk userId -> user_profiles.id (UUID).
 *
 * Clerk userIds are strings ("user_2xY..."). user_profiles.id is a UUID
 * (legacy schema, referenced as FK by many tables). During the coexistence
 * window we resolve at request time via the clerk_user_id column.
 *
 * Caller invariants:
 * - Clerk webhook (/api/webhooks/clerk) populates clerk_user_id on user.created.
 * - For users who haven't signed in via Clerk yet (legacy Supabase users),
 *   resolveUserProfileId() returns null until Phase E migration backfills
 *   their clerk_user_id.
 */
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Resolve the current request's Clerk userId to a user_profiles.id (UUID).
 * Returns null if:
 * - No active Clerk session, or
 * - No user_profiles row has been linked to this clerk_user_id yet.
 *
 * For places that need the Clerk userId directly (no profile lookup),
 * call `auth()` directly.
 */
export async function resolveUserProfileId(): Promise<string | null> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  return resolveUserProfileIdFromClerkId(clerkUserId)
}

/**
 * Map a Clerk userId to a user_profiles.id. Useful when you already have
 * the clerkUserId from a request and don't want to call auth() again.
 */
export async function resolveUserProfileIdFromClerkId(
  clerkUserId: string
): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle()

    if (error) {
      console.warn(
        '[resolveUserProfileIdFromClerkId] Supabase lookup error:',
        error.message
      )
      return null
    }

    return data?.id ?? null
  } catch (e) {
    console.warn('[resolveUserProfileIdFromClerkId] Unexpected error:', e)
    return null
  }
}
