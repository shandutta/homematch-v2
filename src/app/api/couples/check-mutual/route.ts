import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { requireUserFromRequest } from '@/lib/api/auth'
import { CouplesService } from '@/lib/services/couples'
import { noStoreJson } from '@/lib/api/cache-control'
import { ApiErrorHandler } from '@/lib/api/errors'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    const auth = await requireUserFromRequest(supabase, request)
    if (!auth.user) return auth.response
    const { user } = auth

    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return ApiErrorHandler.badRequest('Property ID is required')
    }

    // Check if this would create a mutual like
    const { wouldBeMutual, partnerUserId } =
      await CouplesService.checkPotentialMutualLike(
        supabase,
        user.id,
        propertyId
      )

    if (!wouldBeMutual || !partnerUserId) {
      return noStoreJson({
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

    return noStoreJson(response)
  } catch (error) {
    console.error('Error checking mutual like:', error)
    return ApiErrorHandler.serverError('Failed to check mutual like', error)
  }
}

// Explicitly reject unsupported methods to avoid hanging requests in tests/E2E
export async function POST() {
  return ApiErrorHandler.methodNotAllowed()
}
export async function PUT() {
  return ApiErrorHandler.methodNotAllowed()
}
export async function DELETE() {
  return ApiErrorHandler.methodNotAllowed()
}
export async function PATCH() {
  return ApiErrorHandler.methodNotAllowed()
}
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
