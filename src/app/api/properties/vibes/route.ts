import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'

/**
 * GET /api/properties/vibes
 *
 * Fetch property vibes with related property data.
 *
 * Query params:
 * - limit: Number of records to return (default 20, max 100)
 * - offset: Number of records to skip (default 0)
 * - propertyId: Optional specific property ID
 */
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
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0')
  const propertyId = url.searchParams.get('propertyId')

  let query = supabase
    .from('property_vibes')
    .select(
      `
        *,
        properties (
          id,
          address,
          city,
          state,
          price,
          bedrooms,
          bathrooms,
          square_feet,
          property_type,
          images
        )
      `
    )
    .order('created_at', { ascending: false })

  if (propertyId) {
    query = query.eq('property_id', propertyId)
  } else {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('[vibes API] Error fetching vibes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vibes' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data })
}
