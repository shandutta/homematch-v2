import { NextResponse } from 'next/server'
import { ingestZillowLocations, ZillowSortOption } from '@/lib/ingestion/zillow'
import { createStandaloneClient } from '@/lib/supabase/standalone'

const VALID_SORT_OPTIONS: ZillowSortOption[] = [
  'Newest',
  'Price_High_Low',
  'Price_Low_High',
  'Beds',
  'Baths',
  'Square_Feet',
]

const DEFAULT_BAY_AREA_LOCATIONS = [
  'San Francisco, CA',
  'Oakland, CA',
  'Berkeley, CA',
  'San Jose, CA',
  'Palo Alto, CA',
  'Mountain View, CA',
  'Sunnyvale, CA',
  'Santa Clara, CA',
  'Fremont, CA',
  'Hayward, CA',
  'Walnut Creek, CA',
  'Concord, CA',
  'San Mateo, CA',
  'Redwood City, CA',
  'Menlo Park, CA',
  'San Rafael, CA',
  'Santa Rosa, CA',
  'Napa, CA',
  'Vallejo, CA',
]

function parseLocations(): string[] {
  const env = process.env.ZILLOW_LOCATIONS
  if (env && env.trim().length > 0) {
    // Split on semicolon only - commas are part of "City, State" format
    return env
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return DEFAULT_BAY_AREA_LOCATIONS
}

export async function POST(req: Request) {
  const secret = process.env.ZILLOW_CRON_SECRET
  const headerSecret = req.headers.get('x-cron-secret')
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('cron_secret')

  if (!secret || (headerSecret !== secret && querySecret !== secret)) {
    return NextResponse.json({ error: 'unauthorized cron' }, { status: 401 })
  }

  const rapidApiKey = process.env.RAPIDAPI_KEY
  const rapidApiHost = process.env.RAPIDAPI_HOST || 'zillow-com1.p.rapidapi.com'

  if (!rapidApiKey) {
    return NextResponse.json({ error: 'RAPIDAPI_KEY missing' }, { status: 503 })
  }

  // Parse optional query parameters
  const sortParam = url.searchParams.get('sort')
  const sort: ZillowSortOption | undefined =
    sortParam && VALID_SORT_OPTIONS.includes(sortParam as ZillowSortOption)
      ? (sortParam as ZillowSortOption)
      : 'Newest' // Default to Newest to catch new listings

  const minPriceParam = url.searchParams.get('minPrice')
  const minPrice = minPriceParam ? parseInt(minPriceParam, 10) : undefined

  const maxPriceParam = url.searchParams.get('maxPrice')
  const maxPrice = maxPriceParam ? parseInt(maxPriceParam, 10) : undefined

  const maxPagesParam = url.searchParams.get('maxPages')
  const maxPages = maxPagesParam ? parseInt(maxPagesParam, 10) : undefined

  const locations = parseLocations()
  const supabase = createStandaloneClient()

  try {
    const summary = await ingestZillowLocations({
      locations,
      rapidApiKey,
      supabase,
      host: rapidApiHost,
      sort,
      minPrice,
      maxPrice,
      maxPages,
    })

    return NextResponse.json({ ok: true, summary }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
