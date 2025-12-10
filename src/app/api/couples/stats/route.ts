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

    // Get household statistics
    const stats = await CouplesService.getHouseholdStats(supabase, user.id)

    if (!stats) {
      return NextResponse.json(
        { error: 'Household not found or no statistics available' },
        { status: 404 }
      )
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error in couples stats API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch household statistics' },
      { status: 500 }
    )
  }
}
