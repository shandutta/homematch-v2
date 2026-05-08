import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/auth'
import { CouplesService } from '@/lib/services/couples'
import { noStoreJson } from '@/lib/api/cache-control'
import { ApiErrorHandler } from '@/lib/api/errors'

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient(request)

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await getUserFromRequest(supabase, request)

    if (authError || !user) {
      return ApiErrorHandler.unauthorized()
    }

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
