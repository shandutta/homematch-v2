/* eslint-disable @typescript-eslint/consistent-type-assertions */
/**
 * Auth compatibility layer: replaces Supabase auth.getUser() with Clerk.
 *
 * Server components import getCurrentUser() instead of calling
 * supabase.auth.getUser(). Returns a compatible shape so minimal
 * changes are needed in consumer files.
 */
import { auth, currentUser } from '@clerk/nextjs/server'

export interface ClerkUser {
  id: string
  email: string | null
  user_metadata: Record<string, unknown>
}

/**
 * Get the current authenticated user via Clerk.
 * Returns null if not authenticated.
 *
 * Usage (replaces supabase.auth.getUser() pattern):
 *
 *   const user = await getCurrentUser()
 *   if (!user) redirect('/login')
 *   // user.id, user.email, user.user_metadata all work
 */
export async function getCurrentUser(): Promise<ClerkUser | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  const primaryEmail = user?.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )

  return {
    id: userId,
    email: primaryEmail?.emailAddress ?? null,
    user_metadata: (user?.publicMetadata ?? {}) as Record<string, unknown>,
  }
}

/**
 * Get just the user ID (lighter weight, no currentUser() call).
 * Use this when you only need the ID.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId ?? null
}
