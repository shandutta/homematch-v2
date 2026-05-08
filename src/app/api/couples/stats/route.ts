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

    // Get household statistics
    const stats = await CouplesService.getHouseholdStats(supabase, user.id)

    if (!stats) {
      return ApiErrorHandler.notFound(
        'Household not found or no statistics available'
      )
    }

    return noStoreJson({ stats })
  } catch (error) {
    console.error('Error in couples stats API:', error)
    return ApiErrorHandler.serverError(
      'Failed to fetch household statistics',
      error
    )
  }
}
