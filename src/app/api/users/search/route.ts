import { NextRequest, NextResponse } from 'next/server'
import { requireUserFromRequest } from '@/lib/api/auth'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { apiRateLimiter } from '@/lib/utils/rate-limit'
import { noStoreJson } from '@/lib/api/cache-control'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    const auth = await requireUserFromRequest(supabase, request)

    if (!auth.user) return auth.response

    // Rate limiting
    const rateLimitResult = await apiRateLimiter.check(auth.user.id)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Get search query
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 3) {
      return NextResponse.json(
        { error: 'Search query must be at least 3 characters' },
        { status: 400 }
      )
    }

    // Use service role client to bypass RLS for user search
    // RLS only allows users to view their own profile, but search needs to see others
    const serviceClient = await getServiceRoleClient()

    // Search for users by email (case-insensitive prefix match)
    // Only return users who have completed onboarding and are not the current user
    const { data: users, error } = await serviceClient
      .from('user_profiles')
      .select('id, email, display_name, household_id')
      .neq('id', auth.user.id)
      .eq('onboarding_completed', true)
      .ilike('email', `${query}%`)
      .limit(10)

    if (error) {
      console.error('Error searching users:', error)
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      )
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
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    )
  }
}
