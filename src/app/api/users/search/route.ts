import { NextRequest } from 'next/server'
import { requireUserFromRequest } from '@/lib/api/auth'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { checkRateLimit, rateLimitKey } from '@/lib/middleware/rateLimiter'
import { noStoreJson } from '@/lib/api/cache-control'
import { ApiErrorHandler } from '@/lib/api/errors'
import { withRouteDeadline } from '@/lib/api/route-deadline'

// @service-role-capability: authenticated, rate-limited invite user lookup;
// exact-email match returns 0 or 1 row. Q5 in the 2026-05-13 audit removed
// the prior ilike-prefix search because any logged-in user could enumerate
// the onboarded user base by sweeping prefixes.
// TODO(D1 follow-up): replace with a constrained search_onboarded_users_for_invite RPC.

// Loose RFC-5321-ish check — enough to reject prefix/partial queries while
// staying permissive about the local-part characters Clerk/Supabase allow.
const isPlausibleEmail = (value: string): boolean => {
  if (value.length < 5 || value.length > 254) return false
  const at = value.indexOf('@')
  if (at < 1 || at !== value.lastIndexOf('@')) return false
  const domain = value.slice(at + 1)
  return domain.length >= 3 && domain.includes('.')
}

export const GET = withRouteDeadline(
  'users:search',
  2000,
  async function GET(request: NextRequest) {
    try {
      const supabase = createApiClient(request)

      const auth = await requireUserFromRequest(supabase, request)

      if (!auth.user) return auth.response

      // Rate limiting
      const rateLimitResponse = await checkRateLimit(
        rateLimitKey('users:search', auth.user.id)
      )
      if (rateLimitResponse) return rateLimitResponse

      // Query must be a full email address — no prefix scanning.
      const searchParams = request.nextUrl.searchParams
      const query = searchParams.get('q')?.trim().toLowerCase()

      if (!query || !isPlausibleEmail(query)) {
        return ApiErrorHandler.badRequest(
          'Search query must be a complete email address'
        )
      }

      // Use service role client to bypass RLS for user lookup. RLS only
      // allows users to view their own profile, but the invite UX needs an
      // exact-email match against onboarded peers.
      const serviceClient = await getServiceRoleClient()

      // Exact match only; returns at most one row.
      const { data: users, error } = await serviceClient
        .from('user_profiles')
        .select('id, email, display_name, household_id')
        .neq('id', auth.user.id)
        .eq('onboarding_completed', true)
        .eq('email', query)
        .limit(1)

      if (error) {
        console.error('Error searching users:', error)
        return ApiErrorHandler.serverError('Failed to search users', error)
      }

      // Return sanitized user data (minimal info for privacy)
      const sanitizedUsers = (users || []).map((u) => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        avatar_url: null, // Not stored in current schema
        household_id: u.household_id,
      }))

      return noStoreJson({ users: sanitizedUsers })
    } catch (error) {
      console.error('Error in user search API:', error)
      return ApiErrorHandler.serverError('Failed to search users', error)
    }
  }
)
