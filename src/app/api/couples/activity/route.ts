import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'
import { withRateLimit } from '@/lib/middleware/rateLimiter'

export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    const startTime = Date.now()

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

      // Parse query parameters
      const searchParams = request.nextUrl.searchParams
      const limitParam = searchParams.get('limit')
      const offsetParam = searchParams.get('offset')

      // Parse and validate limit (default: 20, min: 1, max: 100)
      let limit = 20
      if (limitParam) {
        const parsedLimit = parseInt(limitParam, 10)
        if (!isNaN(parsedLimit)) {
          limit = Math.min(Math.max(parsedLimit, 1), 100)
        }
      }

      // Parse and validate offset (default: 0, min: 0)
      let offset = 0
      if (offsetParam) {
        const parsedOffset = parseInt(offsetParam, 10)
        if (!isNaN(parsedOffset)) {
          offset = Math.max(parsedOffset, 0)
        }
      }

      // Get household activity (cached and optimized)
      const activity = await CouplesService.getHouseholdActivity(
        supabase,
        user.id,
        limit,
        offset
      )

      const totalTime = Date.now() - startTime
      console.log(
        `[Activity API] Total request time: ${totalTime}ms for ${activity.length} activities`
      )

      return NextResponse.json({
        activity,
        performance: {
          totalTime,
          cached: totalTime < 100, // Likely cached if very fast
          count: activity.length,
        },
      })
    } catch (error) {
      console.error('Error in activity API:', error)
      return NextResponse.json(
        { error: 'Failed to fetch household activity' },
        { status: 500 }
      )
    }
  })
}
