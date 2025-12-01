import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getServiceRoleClient } from '@/lib/supabase/service-role-client'
import { apiRateLimiter } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    // Get the current user (authenticate first)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await apiRateLimiter.check(user.id)
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
      .neq('id', user.id)
      .eq('onboarding_completed', true)
      .ilike('email', `${query}%`)
      .limit(10)

    console.log('[User Search] Query:', query, 'Current user:', user.id)
    console.log('[User Search] Results:', users?.length ?? 0, 'users found')

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

    return NextResponse.json({ users: sanitizedUsers })
  } catch (error) {
    console.error('Error in user search API:', error)
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    )
  }
}
