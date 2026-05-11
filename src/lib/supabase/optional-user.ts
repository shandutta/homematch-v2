import type { User } from '@supabase/supabase-js'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createClient } from './server'

const isMissingSupabaseConfigError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes('project') &&
  error.message.includes('URL') &&
  error.message.includes('Key')

/**
 * Optional server-side user lookup.
 *
 * Phase C coexistence: Clerk first, then fall back to Supabase auth for
 * users still on the legacy auth path. Returns a Supabase-User-shaped object
 * so all existing consumers keep working unchanged.
 *
 * After Phase E (user data migration), the Supabase fallback can be removed.
 *
 * NOTE: when Clerk is the source of truth, `user.id` is the Clerk userId
 * (e.g. "user_2xY..."), NOT a Supabase auth UUID. Consumers that pass this
 * id as an FK to user_profiles.id (a UUID column) will fail. Use
 * resolveUserProfileId() from src/lib/auth/profile.ts to map Clerk id -> UUID.
 */
export async function getOptionalServerUser(): Promise<User | null> {
  // Try Clerk first.
  try {
    const { userId: clerkUserId } = await auth()
    if (clerkUserId) {
      const clerkUser = await currentUser()
      const primaryEmail = clerkUser?.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )

      // Shape-compat with @supabase/supabase-js User. Many fields are not
      // meaningful for Clerk users (aud, app_metadata, etc.) but consumers
      // mostly read id/email/created_at.
      return {
        id: clerkUserId,
        aud: 'authenticated',
        role: 'authenticated',
        email: primaryEmail?.emailAddress ?? undefined,
        email_confirmed_at: primaryEmail?.verification?.status === 'verified'
          ? new Date().toISOString()
          : undefined,
        phone: clerkUser?.phoneNumbers[0]?.phoneNumber,
        confirmed_at: clerkUser?.createdAt
          ? new Date(clerkUser.createdAt).toISOString()
          : undefined,
        last_sign_in_at: clerkUser?.lastSignInAt
          ? new Date(clerkUser.lastSignInAt).toISOString()
          : undefined,
        app_metadata: {
          provider: 'clerk',
        },
        user_metadata: (clerkUser?.publicMetadata ?? {}) as Record<
          string,
          unknown
        >,
        identities: [],
        created_at: clerkUser?.createdAt
          ? new Date(clerkUser.createdAt).toISOString()
          : new Date().toISOString(),
        updated_at: clerkUser?.updatedAt
          ? new Date(clerkUser.updatedAt).toISOString()
          : undefined,
        is_anonymous: false,
      }
    }
  } catch (error) {
    // Clerk lookup failed (e.g. no session). Fall through to Supabase.
    if (process.env.DEBUG_AUTH === 'true') {
      console.warn('[OptionalUser] Clerk lookup failed, trying Supabase:', error)
    }
  }

  // Legacy Supabase fallback for users not yet migrated.
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user
  } catch (error) {
    if (isMissingSupabaseConfigError(error)) {
      console.warn(
        '[Supabase][Server] Missing public config; treating request as unauthenticated'
      )
      return null
    }

    throw error
  }
}
