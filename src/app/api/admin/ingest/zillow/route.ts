import { NextResponse } from 'next/server'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import { rateLimitAdminRoute } from '@/lib/api/admin-rate-limit'
import { ApiErrorHandler } from '@/lib/api/errors'
import {
  isPaidRapidApiApproved,
  RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE,
} from '@/lib/api/rapidapi-approval-gate'

// New unified provider module
import {
  ingestZillowLocations,
  discoverLocations,
} from '@/lib/providers/zillow/ingest'
import { mapSearchItemToProperty } from '@/lib/providers/zillow/transform'
import { emitIngestEvent } from '@/lib/providers/zillow/observability'
import type { ZillowSortOption } from '@/lib/providers/zillow/types'

// ── Constants ────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────

function parseLocations(): string[] {
  const env = process.env.ZILLOW_LOCATIONS
  if (env && env.trim().length > 0) {
    return env
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return DEFAULT_BAY_AREA_LOCATIONS
}

function parseQueryParams(url: URL): {
  sort: ZillowSortOption
  minPrice: number | undefined
  maxPrice: number | undefined
  maxPages: number | undefined
  dryRun: boolean
} {
  const sortParam = url.searchParams.get('sort')
  const sort = isZillowSortOption(sortParam ?? '')
    ? (sortParam as ZillowSortOption)
    : 'Newest'

  const minPriceParam = url.searchParams.get('minPrice')
  const minPrice = minPriceParam ? parseInt(minPriceParam, 10) : undefined

  const maxPriceParam = url.searchParams.get('maxPrice')
  const maxPrice = maxPriceParam ? parseInt(maxPriceParam, 10) : undefined

  const maxPagesParam = url.searchParams.get('maxPages')
  const maxPages = maxPagesParam ? parseInt(maxPagesParam, 10) : undefined

  const dryRun =
    url.searchParams.get('dryRun') === 'true' ||
    url.searchParams.get('dryrun') === 'true'

  return { sort, minPrice, maxPrice, maxPages, dryRun }
}

// ── Dry‑run handler ──────────────────────────────────────────────────

async function handleDryRun(
  locations: string[],
  rapidApiKey: string,
  rapidApiHost: string,
  sort: ZillowSortOption,
  minPrice: number | undefined,
  maxPrice: number | undefined
) {
  const discoverResults = await discoverLocations({
    locations,
    rapidApiKey,
    supabase: undefined as unknown as Parameters<typeof discoverLocations>[0]['supabase'],
    host: rapidApiHost,
    sort,
    minPrice,
    maxPrice,
    dryRun: true,
    maxPages: 1,
  })

  const sampleProperties: Record<string, unknown>[] = []
  let totalItems = 0
  let totalRequests = 0

  for (const dr of discoverResults) {
    totalRequests += 1 // 1 request per location in dry-run mode
    totalItems += dr.items.length

    // Build sample properties from the first 3 items (max)
    for (const item of dr.items.slice(0, 3)) {
      const mapped = mapSearchItemToProperty(item, dr.location)
      if (mapped) {
        sampleProperties.push({
          zpid: mapped.zpid,
          address: mapped.address,
          city: mapped.city,
          state: mapped.state,
          price: mapped.price,
          bedrooms: mapped.bedrooms,
          bathrooms: mapped.bathrooms,
          property_type: mapped.property_type,
          property_hash: mapped.property_hash,
        })
      }
    }
  }

  emitIngestEvent('ingest.upsert.complete', {
    dryRun: true,
    locations: locations.length,
    estimatedRequests: totalRequests,
    sampleCount: sampleProperties.length,
  })

  return NextResponse.json(
    {
      dryRun: true,
      locations: locations.length,
      estimatedRequests: totalRequests,
      estimatedRapidApiCost: `~${totalRequests} RapidAPI requests`,
      sampleProperties: sampleProperties.slice(0, 10),
      totalItemsFound: totalItems,
    },
    { status: 200 }
  )
}

// ── Route handler ────────────────────────────────────────────────────

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

  const { sort, minPrice, maxPrice, maxPages, dryRun } =
    parseQueryParams(url)

  const locations = parseLocations()

  // Dry-run: no DB writes, no paid-API gate needed (estimates only)
  if (dryRun) {
    return handleDryRun(locations, rapidApiKey, rapidApiHost, sort, minPrice, maxPrice)
  }

  // Full ingest: requires paid-API approval and a Supabase client
  if (!isPaidRapidApiApproved()) {
    return ApiErrorHandler.serviceUnavailable(
      RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE
    )
  }

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
