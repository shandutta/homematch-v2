import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

/**
 * Extracts the authenticated user from a request using either the bearer token
 * header or the Supabase client context. Retries without an explicit token when
 * the first lookup fails to smooth over occasional header parsing issues.
 */
export async function getUserFromRequest(
  supabase: SupabaseClient,
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
