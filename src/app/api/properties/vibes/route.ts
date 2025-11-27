import { NextResponse } from 'next/server'
import { createStandaloneClient } from '@/lib/supabase/standalone'

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
export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0')
  const propertyId = url.searchParams.get('propertyId')

  const supabase = createStandaloneClient()

  // Note: property_vibes table is not in generated types yet
  // Using type assertion until types are regenerated after migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
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
    const errorCode = (error as { code?: string }).code
    if (errorCode === '42P01') {
      console.error(
        '[vibes API] property_vibes table missing - run migration 20251127150000_create_property_vibes_table.sql'
      )
      return NextResponse.json(
        {
          error:
            'Vibes data not initialized. Run the property_vibes migration.',
        },
        { status: 503 }
      )
    }

    console.error('[vibes API] Error fetching vibes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vibes' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data })
}
