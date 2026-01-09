import { NextResponse } from 'next/server'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import { createVibesService, VibesService } from '@/lib/services/vibes'
import type { Property, PropertyType } from '@/lib/schemas/property'

interface GenerateVibesRequest {
  propertyIds?: string[]
  count?: number
  diverseSelection?: boolean
  force?: boolean
}

interface GenerateVibesResponse {
  ok: boolean
  summary?: {
    total: number
    success: number
    failed: number
    skipped: number
    totalCostUsd: number
    totalTimeMs: number
  }
  results?: Array<{
    propertyId: string
    tagline: string
    vibeStatement: string
    suggestedTags: string[]
    costUsd: number
  }>
  errors?: Array<{
    propertyId: string
    error: string
  }>
  error?: string
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
export async function POST(
  req: Request
): Promise<NextResponse<GenerateVibesResponse>> {
  // Authenticate - require cron secret for admin endpoints
  const secret = process.env.VIBES_CRON_SECRET || process.env.ZILLOW_CRON_SECRET
  const isDev = process.env.NODE_ENV === 'development'
  const url = new URL(req.url)
  const headerSecret = req.headers.get('x-cron-secret')
  const querySecret = url.searchParams.get('cron_secret')

  if (!secret || (headerSecret !== secret && querySecret !== secret)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Check for OpenRouter API key
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'OPENROUTER_API_KEY not configured' },
      { status: 503 }
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
        .select('*')
        .in('id', body.propertyIds.slice(0, 50))

      if (error) throw error
      properties = (data ?? []) as Property[]
    } else if (diverse) {
      // Select diverse mix of properties
      properties = await selectDiverseProperties(supabase, count)
    } else {
      // Random selection of properties with images
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .not('images', 'is', null)
        .gte('price', 100000) // Filter out likely bad data
        .order('created_at', { ascending: false })
        .limit(count * 2) // Get more, then sample

      if (error) throw error

      // Random sample
      const shuffled = ((data ?? []) as Property[]).sort(
        () => Math.random() - 0.5
      )
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

    // Generate vibes
    const vibesService = createVibesService()
    const batchResult = await vibesService.generateVibesBatch(
      propertiesToProcess,
      {
        delayMs: 1500,
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
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Select a diverse mix of properties for testing
 */
async function selectDiverseProperties(
  supabase: ReturnType<typeof createStandaloneClient>,
  count: number
): Promise<Property[]> {
  const perType = Math.ceil(count / 4)

  // Get properties by type
  const types: PropertyType[] = [
    'single_family',
    'condo',
    'townhome',
    'multi_family',
  ]
  const results: Property[] = []

  for (const type of types) {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('property_type', type)
      .not('images', 'is', null)
      .gte('price', 100000)
      .order('price', { ascending: false })
      .limit(perType * 2)

    const typedData = (data ?? []) as Property[]
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
export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.VIBES_CRON_SECRET || process.env.ZILLOW_CRON_SECRET
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('cron_secret')

  if (!secret || querySecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createStandaloneClient()

  // Note: property_vibes table is not in generated types yet
  const { count: vibesCount } = await supabase
    .from('property_vibes')
    .select('*', { count: 'exact', head: true })

  const { count: propertiesCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .not('images', 'is', null)

  return NextResponse.json({
    ok: true,
    stats: {
      totalProperties: propertiesCount || 0,
      propertiesWithVibes: vibesCount || 0,
      propertiesWithoutVibes: (propertiesCount || 0) - (vibesCount || 0),
      openRouterConfigured: !!process.env.OPENROUTER_API_KEY,
    },
  })
}
