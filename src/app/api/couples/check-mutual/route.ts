import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/auth'
import { CouplesService } from '@/lib/services/couples'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await getUserFromRequest(supabase, request)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json(
        { error: 'Property ID is required' },
        { status: 400 }
      )
    }

    // Check if this would create a mutual like
    const { wouldBeMutual, partnerUserId } =
      await CouplesService.checkPotentialMutualLike(
        supabase,
        user.id,
        propertyId
      )

    if (!wouldBeMutual || !partnerUserId) {
      return NextResponse.json({
        isMutual: false,
      })
    }

    // Get partner details
    const { data: partnerProfile } = await supabase
      .from('user_profiles')
      .select('display_name, email')
      .eq('id', partnerUserId)
      .single()

    // Get property details
    const { data: property } = await supabase
      .from('properties')
      .select('address')
      .eq('id', propertyId)
      .single()

    // Get current household stats to check for streaks/milestones
    const stats = await CouplesService.getHouseholdStats(supabase, user.id)

    const response = {
      isMutual: true,
      partnerName:
        partnerProfile?.display_name ||
        partnerProfile?.email ||
        'Household member',
      propertyAddress: property?.address || 'this property',
      streak: stats?.activity_streak_days,
      milestone:
        stats?.total_mutual_likes &&
        stats.total_mutual_likes > 0 &&
        stats.total_mutual_likes % 5 === 0
          ? { type: 'mutual_likes', count: stats.total_mutual_likes }
          : undefined,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error checking mutual like:', error)
    return NextResponse.json(
      { error: 'Failed to check mutual like' },
      { status: 500 }
    )
  }
}

// Explicitly reject unsupported methods to avoid hanging requests in tests/E2E
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
