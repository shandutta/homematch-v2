import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Search for users by email (case-insensitive prefix match)
    // Only return users who have completed onboarding and are not the current user
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, avatar_url, household_id')
      .neq('id', user.id)
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
      avatar_url: u.avatar_url,
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
