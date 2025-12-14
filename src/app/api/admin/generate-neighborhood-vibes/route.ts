import { NextResponse } from 'next/server'
import { Neighborhood } from '@/lib/schemas/property'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import { createNeighborhoodVibesService } from '@/lib/services/vibes/neighborhood-vibes-service'
import { NeighborhoodVibeRecord } from '@/lib/schemas/neighborhood-vibes'
import { NeighborhoodStatsResult } from '@/lib/services/supabase-rpc-types'

interface GenerateNeighborhoodVibesResponse {
  ok: boolean
  processed: number
  successes: Array<{
    neighborhoodId: string
    tagline: string
    costUsd: number
  }>
  errors: Array<{
    neighborhoodId: string
    error: string
  }>
  totalCostUsd: number
  error?: string
}

export async function POST(
  req: Request
): Promise<NextResponse<GenerateNeighborhoodVibesResponse>> {
  const secret = process.env.VIBES_CRON_SECRET || process.env.ZILLOW_CRON_SECRET
  const url = new URL(req.url)
  const headerSecret = req.headers.get('x-cron-secret')
  const querySecret = url.searchParams.get('cron_secret')

  if (!secret || (headerSecret !== secret && querySecret !== secret)) {
    return NextResponse.json(
      {
        ok: false,
        processed: 0,
        successes: [],
        errors: [],
        totalCostUsd: 0,
        error: 'Unauthorized',
      },
      { status: 401 }
    )
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        processed: 0,
        successes: [],
        errors: [],
        totalCostUsd: 0,
        error: 'OPENROUTER_API_KEY not configured',
      },
      { status: 503 }
    )
  }

  const limit = Math.min(
    parseInt(url.searchParams.get('limit') || '') || 10,
    50
  )
  const force = url.searchParams.get('force') === 'true'

  const supabase = createStandaloneClient()
  const service = createNeighborhoodVibesService()

  const neighborhoodQuery = supabase
    .from('neighborhoods')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!force) {
    neighborhoodQuery.is('vibe_summary', null)
  }

  const { data: neighborhoods, error: fetchError } = await neighborhoodQuery

  if (fetchError) {
    return NextResponse.json(
      {
        ok: false,
        processed: 0,
        successes: [],
        errors: [],
        totalCostUsd: 0,
        error: fetchError.message,
      },
      { status: 500 }
    )
  }

  if (!neighborhoods || neighborhoods.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      successes: [],
      errors: [],
      totalCostUsd: 0,
    })
  }

  const results: GenerateNeighborhoodVibesResponse = {
    ok: true,
    processed: neighborhoods.length,
    successes: [],
    errors: [],
    totalCostUsd: 0,
  }

  for (const neighborhood of neighborhoods as Neighborhood[]) {
    try {
      const stats = await fetchNeighborhoodStats(supabase, neighborhood.id)

      const generation = await service.generateVibe({
        neighborhood,
        stats,
      })

      const record: NeighborhoodVibeRecord = {
        vibe_tagline: generation.vibes.tagline,
        vibe_summary: generation.vibes.vibeSummary,
        vibe_keywords: generation.vibes.keywords,
        vibe_generated_at: new Date().toISOString(),
        vibe_model: generation.modelUsed,
      }

      const { error: updateError } = await supabase
        .from('neighborhoods')
        .update(record)
        .eq('id', neighborhood.id)

      if (updateError) {
        throw updateError
      }

      results.successes.push({
        neighborhoodId: neighborhood.id,
        tagline: generation.vibes.tagline,
        costUsd: generation.usage.estimatedCostUsd,
      })
      results.totalCostUsd += generation.usage.estimatedCostUsd
    } catch (error) {
      results.errors.push({
        neighborhoodId: neighborhood.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json(results)
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
    return (data[0] as NeighborhoodStatsResult) || null
  }

  return (data as NeighborhoodStatsResult) || null
}
