import { NextResponse } from 'next/server'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import {
  createNeighborhoodVibesService,
  NeighborhoodVibesService,
  type NeighborhoodContext,
} from '@/lib/services/neighborhood-vibes'
import { type NeighborhoodStatsResult } from '@/lib/services/supabase-rpc-types'
import { rateLimitAdminRoute } from '@/lib/api/admin-rate-limit'
import { ApiErrorHandler } from '@/lib/api/errors'

interface GenerateNeighborhoodVibesRequest {
  neighborhoodIds?: string[]
  limit?: number
  force?: boolean
  delayMs?: number
}

export async function POST(req: Request) {
  const secret = process.env.VIBES_CRON_SECRET || process.env.ZILLOW_CRON_SECRET
  const url = new URL(req.url)
  const headerSecret = req.headers.get('x-cron-secret')
  const querySecret = url.searchParams.get('cron_secret')

  if (!secret || (headerSecret !== secret && querySecret !== secret)) {
    return ApiErrorHandler.unauthorized('Unauthorized')
  }

  const rateLimitResponse = await rateLimitAdminRoute(
    req,
    'admin:generate-neighborhood-vibes'
  )
  if (rateLimitResponse) return rateLimitResponse

  if (!process.env.OPENROUTER_API_KEY) {
    return ApiErrorHandler.serviceUnavailable(
      'OPENROUTER_API_KEY not configured'
    )
  }

  let body: GenerateNeighborhoodVibesRequest = {}
  try {
    const text = await req.text()
    if (text) body = JSON.parse(text)
  } catch {
    // empty body is fine
  }

  const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '', 10)
  const limit = Math.min(
    Math.max(Number.isFinite(limitParam) ? limitParam : (body.limit ?? 25), 1),
    50
  )
  const requestedIds = body.neighborhoodIds || []
  const force = url.searchParams.get('force') === 'true' || body.force === true
  const delayMsParam = Number.parseInt(
    url.searchParams.get('delayMs') ?? '',
    10
  )
  const delayMs = Math.min(
    Math.max(
      Number.isFinite(delayMsParam) ? delayMsParam : (body.delayMs ?? 800),
      0
    ),
    5000
  )

  const supabase = createStandaloneClient()

  let neighborhoodQuery = supabase
    .from('neighborhoods')
    .select('*, neighborhood_vibes!left(id)')
    .order('created_at', { ascending: false })

  if (requestedIds.length > 0) {
    neighborhoodQuery = neighborhoodQuery.in('id', requestedIds.slice(0, 50))
  } else {
    neighborhoodQuery = neighborhoodQuery.limit(limit)
    if (!force) {
      neighborhoodQuery = neighborhoodQuery.is('neighborhood_vibes.id', null)
    }
  }

  const { data: neighborhoods, error } = await neighborhoodQuery
  if (error) {
    console.error(
      '[generate-neighborhood-vibes] Failed to load neighborhoods',
      error
    )
    return ApiErrorHandler.serverError(
      'Failed to load neighborhoods',
      error
    )
  }

  if (!neighborhoods || neighborhoods.length === 0) {
    return NextResponse.json({
      ok: true,
      summary: {
        total: 0,
        success: 0,
        failed: 0,
        totalCostUsd: 0,
        totalTimeMs: 0,
      },
      results: [],
      errors: [],
    })
  }

  const neighborhoodIds = neighborhoods.map((n) => n.id)

  const { data: allListings } = await supabase
    .from('properties')
    .select('neighborhood_id, address, price, bedrooms, bathrooms, property_type')
    .in('neighborhood_id', neighborhoodIds)

  const listingsByNeighborhood = new Map<string, NonNullable<typeof allListings>>()
  for (const listing of allListings ?? []) {
    const bucket = listingsByNeighborhood.get(listing.neighborhood_id) ?? []
    if (bucket.length < 12) {
      bucket.push(listing)
      listingsByNeighborhood.set(listing.neighborhood_id, bucket)
    }
  }

  const contexts: NeighborhoodContext[] = []

  for (const neighborhood of neighborhoods) {
    const listingStats = await fetchNeighborhoodStats(supabase, neighborhood.id)
    const listings = listingsByNeighborhood.get(neighborhood.id) ?? []

    contexts.push({
      neighborhoodId: neighborhood.id,
      name: neighborhood.name,
      city: neighborhood.city,
      state: neighborhood.state,
      metroArea: neighborhood.metro_area,
      medianPrice: neighborhood.median_price,
      walkScore: neighborhood.walk_score,
      transitScore: neighborhood.transit_score,
      listingStats,
      sampleProperties: listings.map((p) => ({
        address: p.address,
        price: p.price,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        propertyType: p.property_type,
      })),
    })
  }

  const service = createNeighborhoodVibesService()
  const batch = await service.generateBatch(contexts, {
    delayMs,
    onProgress: (completed, total) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[generate-neighborhood-vibes] Progress ${completed}/${total}`
        )
      }
    },
  })

  const inserts: Array<
    ReturnType<typeof NeighborhoodVibesService.toInsertRecord>
  > = []
  for (const result of batch.success) {
    const context = contexts.find(
      (c) => c.neighborhoodId === result.neighborhoodId
    )
    if (!context) continue
    const record = NeighborhoodVibesService.toInsertRecord(
      result,
      context,
      result.rawOutput
    )
    inserts.push(record)
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from('neighborhood_vibes')
      .upsert(inserts, {
        onConflict: 'neighborhood_id',
        ignoreDuplicates: false,
      })

    if (insertError) {
      console.error(
        '[generate-neighborhood-vibes] Failed to store vibes',
        insertError
      )
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total: contexts.length,
      success: batch.success.length,
      failed: batch.failed.length,
      totalCostUsd: batch.totalCostUsd,
      totalTimeMs: batch.totalTimeMs,
    },
    results: batch.success.map((r) => ({
      neighborhoodId: r.neighborhoodId,
      tagline: r.vibes.tagline,
      vibeStatement: r.vibes.vibeStatement,
      costUsd: r.usage.estimatedCostUsd,
    })),
    errors: batch.failed,
  })
}

async function fetchNeighborhoodStats(
  supabase: ReturnType<typeof createStandaloneClient>,
  neighborhoodId: string
): Promise<NeighborhoodStatsResult | null> {
  const { data, error } = await supabase.rpc('get_neighborhood_stats', {
    neighborhood_uuid: neighborhoodId,
  })

  if (error) {
    console.warn('[generate-neighborhood-vibes] Failed to fetch stats', {
      neighborhoodId,
      error: error.message,
    })
    return null
  }

  if (Array.isArray(data)) {
    const [first] = data
    return isNeighborhoodStatsResult(first) ? first : null
  }

  return isNeighborhoodStatsResult(data) ? data : null
}

const isNeighborhoodStatsResult = (
  value: unknown
): value is NeighborhoodStatsResult => {
  if (typeof value !== 'object' || value === null) return false
  return 'total_properties' in value
}
