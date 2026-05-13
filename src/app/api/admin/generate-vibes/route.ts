import { NextResponse } from 'next/server'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import { createVibesService, VibesService } from '@/lib/services/vibes'
import { buildNeighborhoodContextMap } from '@/lib/services/vibes/neighborhood-context-builder'
import type { Property, PropertyType } from '@/lib/schemas/property'
import { noStoreJson } from '@/lib/api/cache-control'
import { rateLimitAdminRoute } from '@/lib/api/admin-rate-limit'
import { ApiErrorHandler } from '@/lib/api/errors'

interface GenerateVibesRequest {
  propertyIds?: string[]
  count?: number
  diverseSelection?: boolean
  force?: boolean
}

/**
 * POST /api/admin/generate-vibes
 *
 * Generate vibes for properties using LLM vision analysis.
 *
 * Query params:
 * - count: Number of random properties to process (default 20, max 50)
 * - diverse: If true, select diverse mix of property types/prices
 *
 * Body (optional):
 * - propertyIds: Specific property IDs to process
 */
export async function POST(req: Request): Promise<Response> {
  // Authenticate - require cron secret for admin endpoints
  const secret = process.env.VIBES_CRON_SECRET || process.env.ZILLOW_CRON_SECRET
  const isDev = process.env.NODE_ENV === 'development'
  const url = new URL(req.url)
  const headerSecret = req.headers.get('x-cron-secret')
  const querySecret = url.searchParams.get('cron_secret')

  if (!secret || (headerSecret !== secret && querySecret !== secret)) {
    return ApiErrorHandler.unauthorized('Unauthorized')
  }

  const rateLimitResponse = await rateLimitAdminRoute(
    req,
    'admin:generate-vibes'
  )
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Check for OpenRouter API key
  if (!process.env.OPENROUTER_API_KEY) {
    return ApiErrorHandler.serviceUnavailable(
      'OPENROUTER_API_KEY not configured'
    )
  }

  // Parse request
  let body: GenerateVibesRequest = {}
  try {
    const text = await req.text()
    if (text) {
      body = JSON.parse(text)
    }
  } catch {
    // Empty body is fine
  }

  const count = Math.min(
    parseInt(url.searchParams.get('count') || '') || body.count || 20,
    50
  )
  const diverse =
    url.searchParams.get('diverse') === 'true' || body.diverseSelection || false
  const force =
    url.searchParams.get('force') === 'true' || body.force === true || false

  const supabase = createStandaloneClient()

  try {
    let properties: Property[]

    if (body.propertyIds && body.propertyIds.length > 0) {
      // Fetch specific properties
      const { data, error } = await supabase
        .from('properties')
        .select(
          'address, amenities, bathrooms, bedrooms, city, coordinates, created_at, description, id, images, is_active, listing_status, lot_size_sqft, neighborhood_id, parking_spots, price, property_hash, property_type, square_feet, state, updated_at, year_built, zip_code, zillow_images_refreshed_at, zillow_images_refreshed_count, zillow_images_refresh_status, zpid'
        )
        .in('id', body.propertyIds.slice(0, 50))
        .overrideTypes<Property[], { merge: false }>()

      if (error) throw error
      properties = data ?? []
    } else if (diverse) {
      // Select diverse mix of properties
      properties = await selectDiverseProperties(supabase, count)
    } else {
      // Random selection of properties with images
      const { data, error } = await supabase
        .from('properties')
        .select(
          'address, amenities, bathrooms, bedrooms, city, coordinates, created_at, description, id, images, is_active, listing_status, lot_size_sqft, neighborhood_id, parking_spots, price, property_hash, property_type, square_feet, state, updated_at, year_built, zip_code, zillow_images_refreshed_at, zillow_images_refreshed_count, zillow_images_refresh_status, zpid'
        )
        .not('images', 'is', null)
        .gte('price', 100000) // Filter out likely bad data
        .order('created_at', { ascending: false })
        .limit(count * 2) // Get more, then sample
        .overrideTypes<Property[], { merge: false }>()

      if (error) throw error

      // Random sample
      const shuffled = (data ?? []).sort(() => Math.random() - 0.5)
      properties = shuffled.slice(0, count)
    }

    if (properties.length === 0) {
      return NextResponse.json({
        ok: true,
        summary: {
          total: 0,
          success: 0,
          failed: 0,
          skipped: 0,
          totalCostUsd: 0,
          totalTimeMs: 0,
        },
        results: [],
        errors: [],
      })
    }

    // Filter to only properties with images
    const propertiesWithImages = properties.filter(
      (p) => p.images && p.images.length > 0
    )

    if (propertiesWithImages.length === 0) {
      return NextResponse.json({
        ok: true,
        summary: {
          total: 0,
          success: 0,
          failed: 0,
          skipped: 0,
          totalCostUsd: 0,
          totalTimeMs: 0,
        },
        results: [],
        errors: [],
      })
    }

    // Skip properties whose source hash hasn't changed (unless forced)
    const { data: existingVibes } = await supabase
      .from('property_vibes')
      .select('property_id, source_data_hash')
      .in(
        'property_id',
        propertiesWithImages.map((p) => p.id)
      )

    const existingHashMap = new Map(
      (existingVibes || []).map(
        (v: { property_id: string; source_data_hash: string }) => [
          v.property_id,
          v.source_data_hash,
        ]
      )
    )

    const currentHashMap = new Map(
      propertiesWithImages.map((p) => [
        p.id,
        VibesService.generateSourceHash(p),
      ])
    )

    const skippedProperties = force
      ? []
      : propertiesWithImages.filter(
          (p) => existingHashMap.get(p.id) === currentHashMap.get(p.id)
        )

    const propertiesToProcess = force
      ? propertiesWithImages
      : propertiesWithImages.filter(
          (p) => existingHashMap.get(p.id) !== currentHashMap.get(p.id)
        )

    if (propertiesToProcess.length === 0) {
      return NextResponse.json({
        ok: true,
        summary: {
          total: propertiesWithImages.length,
          success: 0,
          failed: 0,
          skipped: skippedProperties.length,
          totalCostUsd: 0,
          totalTimeMs: 0,
        },
        results: [],
        errors: [],
      })
    }

    if (isDev) {
      console.log(
        `[generate-vibes] Processing ${propertiesToProcess.length} properties (${skippedProperties.length} skipped)...`
      )
    }

    // Build the neighborhood-vibes context map so the LLM gets grounded
    // neighborhood signal (themes / walk / transit scores) instead of guessing
    // at location tags. NEIGHBORHOOD-VIBES-WIRE.
    const extrasByPropertyId = await buildNeighborhoodContextMap(
      supabase,
      propertiesToProcess
    )

    // Generate vibes
    const vibesService = createVibesService()
    const batchResult = await vibesService.generateVibesBatch(
      propertiesToProcess,
      {
        delayMs: 1500,
        extrasByPropertyId: new Map(
          Array.from(extrasByPropertyId.entries()).map(([id, ctx]) => [
            id,
            { neighborhoodVibes: ctx },
          ])
        ),
        onProgress: (completed, total) => {
          if (isDev) {
            console.log(`[generate-vibes] Progress: ${completed}/${total}`)
          }
        },
      }
    )

    // Store results in database
    const insertRecords: Array<ReturnType<typeof VibesService.toInsertRecord>> =
      []
    for (const result of batchResult.success) {
      const property = propertiesToProcess.find(
        (p) => p.id === result.propertyId
      )
      if (!property) continue

      const record = VibesService.toInsertRecord(
        result,
        property,
        result.rawOutput
      )
      insertRecords.push(record)
    }

    if (insertRecords.length > 0) {
      if (isDev) {
        console.log(
          `[generate-vibes] Attempting to insert ${insertRecords.length} vibes records...`
        )
      }
      // Note: property_vibes table is not in generated types yet
      // Using type assertion until types are regenerated after migration
      const { data: insertData, error: insertError } = await supabase
        .from('property_vibes')
        .upsert(insertRecords, {
          onConflict: 'property_id',
          ignoreDuplicates: false,
        })
        .select('id')

      if (insertError) {
        console.error('[generate-vibes] Failed to store vibes:', insertError)
      } else {
        if (isDev) {
          console.log(
            `[generate-vibes] Successfully stored ${insertData?.length || 0} vibes records`
          )
        }
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        total: propertiesToProcess.length + skippedProperties.length,
        success: batchResult.success.length,
        failed: batchResult.failed.length,
        skipped: skippedProperties.length,
        totalCostUsd: batchResult.totalCostUsd,
        totalTimeMs: batchResult.totalTimeMs,
      },
      results: batchResult.success.map((r) => ({
        propertyId: r.propertyId,
        tagline: r.vibes.tagline,
        vibeStatement: r.vibes.vibeStatement,
        suggestedTags: r.vibes.suggestedTags,
        costUsd: r.usage.estimatedCostUsd,
      })),
      errors: batchResult.failed,
    })
  } catch (error) {
    console.error('[generate-vibes] Error:', error)
    return ApiErrorHandler.serverError(
      error instanceof Error ? error.message : 'Unknown error',
      error
    )
  }
}

/**
 * Select a diverse mix of properties for testing.
 *
 * Per audit M12.3: was running one SELECT per property type serially
 * (4 round-trips). Now fans out via Promise.all so wall-clock cost is one
 * RTT instead of four. Same projection, same per-type cap, same client-side
 * reshuffle, identical result set.
 */
async function selectDiverseProperties(
  supabase: ReturnType<typeof createStandaloneClient>,
  count: number
): Promise<Property[]> {
  const perType = Math.ceil(count / 4)

  const types: PropertyType[] = [
    'single_family',
    'condo',
    'townhome',
    'multi_family',
  ]

  const typeResults = await Promise.all(
    types.map(async (type) => {
      const { data } = await supabase
        .from('properties')
        .select(
          'address, amenities, bathrooms, bedrooms, city, coordinates, created_at, description, id, images, is_active, listing_status, lot_size_sqft, neighborhood_id, parking_spots, price, property_hash, property_type, square_feet, state, updated_at, year_built, zip_code, zillow_images_refreshed_at, zillow_images_refreshed_count, zillow_images_refresh_status, zpid, last_refreshed_at, source_fingerprint'
        )
        .eq('property_type', type)
        .not('images', 'is', null)
        .gte('price', 100000)
        .order('price', { ascending: false })
        .limit(perType * 2)
        .overrideTypes<Property[], { merge: false }>()
      return data ?? []
    })
  )

  const results: Property[] = []
  for (const typedData of typeResults) {
    if (typedData.length > 0) {
      // Take mix of price ranges
      const shuffled = typedData.sort(() => Math.random() - 0.5)
      results.push(...shuffled.slice(0, perType))
    }
  }

  // Shuffle and return requested count
  return results.sort(() => Math.random() - 0.5).slice(0, count)
}

/**
 * GET /api/admin/generate-vibes
 *
 * Get vibes generation status and existing vibes count
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.VIBES_CRON_SECRET || process.env.ZILLOW_CRON_SECRET
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('cron_secret')

  if (!secret || querySecret !== secret) {
    return ApiErrorHandler.unauthorized('Unauthorized')
  }

  const rateLimitResponse = await rateLimitAdminRoute(
    req,
    'admin:generate-vibes'
  )
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const supabase = createStandaloneClient()

  // Note: property_vibes table is not in generated types yet
  const { count: vibesCount } = await supabase
    .from('property_vibes')
    .select('id', { count: 'exact', head: true })

  const { count: propertiesCount } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .not('images', 'is', null)

  return noStoreJson({
    ok: true,
    stats: {
      totalProperties: propertiesCount || 0,
      propertiesWithVibes: vibesCount || 0,
      propertiesWithoutVibes: (propertiesCount || 0) - (vibesCount || 0),
      openRouterConfigured: !!process.env.OPENROUTER_API_KEY,
    },
  })
}
