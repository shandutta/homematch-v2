/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Clerk → Supabase User shape conversion requires explicit casts because
// the shape is structurally similar but TypeScript can't infer it.
import type { User } from '@supabase/supabase-js'
import type { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { ApiErrorHandler } from '@/lib/api/errors'
import { resolveUserProfileIdFromClerkId } from '@/lib/auth/profile'

type AuthUserResult = {
  data: { user: User | null }
  error: Error | null
}

type AuthUserReader = {
  auth: {
    getUser: (jwt?: string) => Promise<AuthUserResult>
  }
}

/**
 * Build a Supabase-User-shaped object from a Clerk session.
 * Sets `id` to the user_profiles.id (UUID) when available so existing API
 * route code that uses `user.id` as an FK keeps working. Falls back to
 * Clerk's userId (string) when no profile row exists yet (e.g. webhook
 * hasn't fired) — callers should defend against this.
 */
async function clerkUserToSupabaseShape(): Promise<User | null> {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  const profileId = await resolveUserProfileIdFromClerkId(clerkUserId)
  const clerkUser = await currentUser()
  const primaryEmail = clerkUser?.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )

  return {
    // CRITICAL: prefer the UUID (profileId) over the Clerk userId so legacy
    // API code that does `.eq('user_id', user.id)` continues to work.
    id: profileId ?? clerkUserId,
    aud: 'authenticated',
    role: 'authenticated',
    email: primaryEmail?.emailAddress ?? undefined,
    email_confirmed_at:
      primaryEmail?.verification?.status === 'verified'
        ? new Date().toISOString()
        : undefined,
    phone: clerkUser?.phoneNumbers[0]?.phoneNumber,
    confirmed_at: clerkUser?.createdAt
      ? new Date(clerkUser.createdAt).toISOString()
      : undefined,
    last_sign_in_at: clerkUser?.lastSignInAt
      ? new Date(clerkUser.lastSignInAt).toISOString()
      : undefined,
    app_metadata: { provider: 'clerk' },
    user_metadata: (clerkUser?.publicMetadata ?? {}) as Record<string, unknown>,
    identities: [],
    created_at: clerkUser?.createdAt
      ? new Date(clerkUser.createdAt).toISOString()
      : new Date().toISOString(),
    updated_at: clerkUser?.updatedAt
      ? new Date(clerkUser.updatedAt).toISOString()
      : undefined,
    is_anonymous: false,
  } as User
}

/**
 * Extracts the authenticated user from a request.
 *
 * Phase C coexistence behavior:
 * 1. Try Clerk's session (from middleware-wrapped clerkMiddleware).
 *    If a Clerk user is present AND has a linked user_profiles row,
 *    returns a Supabase-User-shaped object with user.id = profile UUID.
 * 2. Fall back to the bearer token / supabase client lookup for legacy
 *    callers (tests, mobile apps, integrations) and existing Supabase
 *    users not yet migrated.
 *
 * Retries without an explicit token when the first lookup fails to smooth
 * over occasional header parsing issues.
 */
export async function getUserFromRequest(
  supabase: AuthUserReader,
  request: NextRequest
): Promise<AuthUserResult> {
  // 1. Try Clerk first.
  try {
    const clerkShape = await clerkUserToSupabaseShape()
    if (clerkShape) {
      return { data: { user: clerkShape }, error: null }
    }
  } catch (e) {
    // Clerk lookup failed; fall through.
    if (process.env.DEBUG_AUTH === 'true') {
      console.warn('[getUserFromRequest] Clerk lookup failed:', e)
    }
  }

  // 2. Legacy Supabase path.
  const authHeader = request.headers.get('authorization') || ''
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]

  // Try explicit bearer token first, then fall back to the client context
  const result = await supabase.auth.getUser(bearerToken ?? undefined)
  if (!result.data.user && bearerToken) {
    return supabase.auth.getUser()
  }

  return result
}

export type RequireUserResult =
  | { user: User; response: null }
  | { user: null; response: NextResponse }

/**
 * Standard API auth boundary. Route handlers should call this instead of
 * open-coding `supabase.auth.getUser()` so bearer-token fallback and the 401
 * response shape stay consistent across app APIs.
 */
export async function requireUserFromRequest(
  supabase: AuthUserReader,
  request: NextRequest
): Promise<RequireUserResult> {
  const {
    data: { user },
    error,
  } = await getUserFromRequest(supabase, request)

  if (error || !user) {
    return { user: null, response: ApiErrorHandler.unauthorized() }
  }

  return { user, response: null }
}
