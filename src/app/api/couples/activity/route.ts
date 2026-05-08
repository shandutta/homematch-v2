import { NextRequest, NextResponse } from 'next/server'
import { requireUserFromRequest } from '@/lib/api/auth'
import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'
import { withRateLimit } from '@/lib/middleware/rateLimiter'
import { noStoreJson } from '@/lib/api/cache-control'

// Explicitly reject unsupported methods to avoid hanging requests in tests
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
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    const startTime = Date.now()

    try {
      const supabase = createApiClient(request)

      const auth = await requireUserFromRequest(supabase, request)

      if (!auth.user) return auth.response

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
      // Add timeout to prevent hanging
      const activityPromise = CouplesService.getHouseholdActivity(
        supabase,
        auth.user.id,
        limit,
        offset
      )

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Activity fetch timed out')), 10000)
      )

      const activity = await Promise.race([activityPromise, timeoutPromise])

      const totalTime = Date.now() - startTime

      return noStoreJson({
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
