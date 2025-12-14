import { NextResponse } from 'next/server'
import { createStandaloneClient } from '@/lib/supabase/standalone'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const neighborhoodId = url.searchParams.get('neighborhoodId')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const supabase = createStandaloneClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (supabase as any)
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
    const errorCode = (error as { code?: string }).code
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
