import { NextResponse } from 'next/server'
import { ingestZillowLocations, ZillowSortOption } from '@/lib/ingestion/zillow'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import { rateLimitAdminRoute } from '@/lib/api/admin-rate-limit'
import { ApiErrorHandler } from '@/lib/api/errors'
import {
  isPaidRapidApiApproved,
  RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE,
} from '@/lib/api/rapidapi-approval-gate'

const VALID_SORT_OPTIONS: ZillowSortOption[] = [
  'Newest',
  'Price_High_Low',
  'Price_Low_High',
  'Beds',
  'Baths',
  'Square_Feet',
]

const isZillowSortOption = (value: string): value is ZillowSortOption =>
  VALID_SORT_OPTIONS.some((option) => option === value)

const DEFAULT_BAY_AREA_LOCATIONS = [
  'San Francisco, CA',
  'Alameda, CA',
  'Albany, CA',
  'American Canyon, CA',
  'Belmont, CA',
  'Benicia, CA',
  'Berkeley, CA',
  'Burlingame, CA',
  'Campbell, CA',
  'Concord, CA',
  'Cotati, CA',
  'Cupertino, CA',
  'Daly City, CA',
  'Danville, CA',
  'Dublin, CA',
  'El Cerrito, CA',
  'Emeryville, CA',
  'Fairfield, CA',
  'Foster City, CA',
  'Fremont, CA',
  'Gilroy, CA',
  'Half Moon Bay, CA',
  'Hayward, CA',
  'Healdsburg, CA',
  'Hercules, CA',
  'Lafayette, CA',
  'Livermore, CA',
  'Los Altos, CA',
  'Los Altos Hills, CA',
  'Los Gatos, CA',
  'Martinez, CA',
  'Menlo Park, CA',
  'Mill Valley, CA',
  'Millbrae, CA',
  'Milpitas, CA',
  'Morgan Hill, CA',
  'Mountain View, CA',
  'Napa, CA',
  'Newark, CA',
  'Novato, CA',
  'Oakland, CA',
  'Orinda, CA',
  'Pacifica, CA',
  'Palo Alto, CA',
  'Petaluma, CA',
  'Piedmont, CA',
  'Pinole, CA',
  'Pleasant Hill, CA',
  'Pleasanton, CA',
  'Redwood City, CA',
  'Richmond, CA',
  'Rohnert Park, CA',
  'San Bruno, CA',
  'San Carlos, CA',
  'San Jose, CA',
  'San Leandro, CA',
  'San Mateo, CA',
  'San Pablo, CA',
  'San Rafael, CA',
  'San Ramon, CA',
  'Saratoga, CA',
  'Santa Clara, CA',
  'Santa Rosa, CA',
  'Sausalito, CA',
  'Sebastopol, CA',
  'Sonoma, CA',
  'South San Francisco, CA',
  'Sunnyvale, CA',
  'Suisun City, CA',
  'Tiburon, CA',
  'Union City, CA',
  'Vacaville, CA',
  'Vallejo, CA',
  'Walnut Creek, CA',
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
    return ApiErrorHandler.unauthorized('unauthorized cron')
  }

  const rateLimitResponse = await rateLimitAdminRoute(
    req,
    'admin:ingest-zillow'
  )
  if (rateLimitResponse) return rateLimitResponse

  const rapidApiKey = process.env.RAPIDAPI_KEY
  const rapidApiHost =
    process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'

  if (!rapidApiKey) {
    return ApiErrorHandler.serviceUnavailable('RAPIDAPI_KEY missing')
  }

  if (!isPaidRapidApiApproved()) {
    return ApiErrorHandler.serviceUnavailable(
      RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE
    )
  }

  // Parse optional query parameters
  const sortParam = url.searchParams.get('sort')
  const sortCandidate = sortParam ?? ''
  const sort: ZillowSortOption = isZillowSortOption(sortCandidate)
    ? sortCandidate
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
    console.error('[ingest-zillow] failed', {
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
    })
    return ApiErrorHandler.serverError(message, err)
  }
}
