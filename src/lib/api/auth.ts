import type { User } from '@supabase/supabase-js'
import type { NextRequest, NextResponse } from 'next/server'
import { ApiErrorHandler } from '@/lib/api/errors'

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
 * Extracts the authenticated user from a request using either the bearer token
 * header or the Supabase client context. Retries without an explicit token when
 * the first lookup fails to smooth over occasional header parsing issues.
 */
export async function getUserFromRequest(
  supabase: AuthUserReader,
  request: NextRequest
) {
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
