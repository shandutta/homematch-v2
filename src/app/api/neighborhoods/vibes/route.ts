import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, parsed)
}

function parseNonNegativeInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, parsed)
}

export async function GET(request: NextRequest) {
  const hasRequestContext =
    typeof request?.headers?.get === 'function' &&
    typeof request?.cookies?.getAll === 'function'
  const supabase = createApiClient(hasRequestContext ? request : undefined)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const neighborhoodId = url.searchParams.get('neighborhoodId')
  const limit = Math.min(
    parsePositiveInt(url.searchParams.get('limit'), 20),
    100
  )
  const offset = parseNonNegativeInt(url.searchParams.get('offset'), 0)

  let query = supabase
    .from('neighborhood_vibes')
    .select(
      `
      *,
      neighborhoods(id, name, city, state, metro_area, walk_score, transit_score, median_price)
    `
    )
    .order('created_at', { ascending: false })

  if (neighborhoodId) {
    query = query.eq('neighborhood_id', neighborhoodId)
  } else {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error } = await query

  if (error) {
    const errorCode = error.code
    if (errorCode === '42P01') {
      return NextResponse.json(
        {
          error:
            'Neighborhood vibes not initialized. Run the neighborhood_vibes migration first.',
        },
        { status: 503 }
      )
    }

    console.error('[neighborhood-vibes API] Error fetching vibes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch neighborhood vibes' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data })
}
