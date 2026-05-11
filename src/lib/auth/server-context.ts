/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Clerk-to-Supabase User shape conversion needs explicit casts.
/**
 * Phase C.2 helper: unified server-side auth context.
 *
 * Server components frequently need BOTH:
 * 1. A user identity (for redirect-to-login logic)
 * 2. A user_profiles.id (UUID) to fetch user data
 *
 * Pre-Clerk: supabase.auth.getUser() returned a User whose .id was both
 * the auth identity and the FK to user_profiles.id (same UUID).
 *
 * Post-Clerk: identity is the Clerk userId (string "user_2xY...") and the
 * FK is user_profiles.id (UUID) resolved via the clerk_user_id column.
 *
 * This helper returns both, plus a legacy fallback for users not yet
 * migrated (Phase E will sunset the fallback).
 */
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export interface ServerUserContext {
  /** Clerk userId ("user_2xY...") or Supabase auth UUID (legacy) */
  authId: string
  /** Source of truth: 'clerk' or 'supabase-legacy' */
  source: 'clerk' | 'supabase-legacy'
  /**
   * user_profiles.id (UUID). For Clerk users, resolved via clerk_user_id.
   * For legacy Supabase users, the auth UUID IS the user_profiles.id.
   * NULL if user has not yet been linked to a user_profiles row
   * (e.g. brand-new Clerk user whose webhook hasn't fired).
   */
  profileId: string | null
  email: string | null
}

/**
 * Get the current server-side user context, or null if unauthenticated.
 *
 * Returns:
 * - { authId, source: 'clerk', profileId } when Clerk session present
 * - { authId, source: 'supabase-legacy', profileId } for legacy users
 * - null if neither auth has a session
 */
export async function getServerUserContext(): Promise<ServerUserContext | null> {
  // Try Clerk first.
  try {
    const { userId: clerkUserId } = await auth()
    if (clerkUserId) {
      const supabase = await createClient()
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle()

      let email: string | null = profile?.email ?? null
      if (!email) {
        // Fall back to Clerk's email if no profile row yet.
        const clerkUser = await currentUser()
        const primary = clerkUser?.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId
        )
        email = primary?.emailAddress ?? null
      }

      return {
        authId: clerkUserId,
        source: 'clerk',
        profileId: profile?.id ?? null,
        email,
      }
    }
  } catch (e) {
    // Clerk lookup failed; fall through to Supabase.
    if (process.env.DEBUG_AUTH === 'true') {
      console.warn('[getServerUserContext] Clerk lookup failed:', e)
    }
  }

  // Legacy Supabase fallback.
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    return {
      authId: user.id,
      source: 'supabase-legacy',
      // For legacy Supabase auth, auth.uid() == user_profiles.id.
      profileId: user.id,
      email: user.email ?? null,
    }
  } catch (e) {
    if (process.env.DEBUG_AUTH === 'true') {
      console.warn('[getServerUserContext] Supabase fallback failed:', e)
    }
    return null
  }
}

/**
 * Like getServerUserContext but requires a profile to exist.
 * Useful for server components that immediately query user-scoped data.
 *
 * Returns null if no profileId can be resolved (e.g. Clerk user before
 * webhook fires, or unauthenticated request).
 */
export async function getServerUserContextWithProfile(): Promise<
  (ServerUserContext & { profileId: string }) | null
> {
  const ctx = await getServerUserContext()
  if (!ctx || !ctx.profileId) return null
  return ctx as ServerUserContext & { profileId: string }
}
