import type { SupabaseClient } from '@supabase/supabase-js'
import type { NeighborhoodContext } from '@/lib/services/neighborhood-vibes/prompts'
import {
  NeighborhoodVibesService,
  type NeighborhoodVibesResult,
} from '@/lib/services/neighborhood-vibes/neighborhood-vibes-service'
import type { NeighborhoodStatsResult } from '@/lib/services/supabase-rpc-types'
import type { AppDatabase } from '@/types/app-database'
import type { Database } from '@/types/database'

type Logger = {
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const STATE_RE = /^[A-Z]{2}$/

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNeighborhoodStatsResult = (
  value: unknown
): value is NeighborhoodStatsResult => {
  if (!isRecord(value)) return false
  const requiredKeys = [
    'total_properties',
    'avg_price',
    'median_price',
    'price_range_min',
    'price_range_max',
    'avg_bedrooms',
    'avg_bathrooms',
    'avg_square_feet',
  ]
  return requiredKeys.every((key) => key in value)
}

export type BackfillNeighborhoodVibesArgs = {
  limit: number | null
  batchSize: number
  delayMs: number
  force: boolean
  neighborhoodIds: string[] | null
  states?: string[] | null
  offset?: number
  sampleLimit: number
  includeStats?: boolean
}

export type BackfillNeighborhoodVibesFailure = {
  neighborhoodId: string
  name: string | null
  city: string | null
  state: string | null
  error: string
  code?: string
}

export type BackfillNeighborhoodVibesCursor = {
  offset: number
  lastNeighborhoodId: string | null
  attempted: number
  skipped: number
  success: number
  failed: number
  totalCostUsd: number
}

export type BackfillNeighborhoodVibesResult = {
  attempted: number
  skipped: number
  success: number
  failed: number
  totalCostUsd: number
  totalTimeMs: number
  failures: BackfillNeighborhoodVibesFailure[]
  nextOffset: number | null
  canceled: boolean
}

export type BackfillNeighborhoodVibesDeps = {
  supabase: SupabaseClient<AppDatabase>
  neighborhoodVibesService: {
    generateVibes: (
      context: NeighborhoodContext
    ) => Promise<NeighborhoodVibesResult>
  }
  logger?: Logger
  sleep?: (ms: number) => Promise<void>
  shouldStop?: () => boolean
  onCursor?: (cursor: BackfillNeighborhoodVibesCursor) => Promise<void> | void
}

type NeighborhoodRow = Database['public']['Tables']['neighborhoods']['Row']

function normalizeOffset(offset: number | undefined): number {
  if (!Number.isFinite(offset)) return 0
  return Math.max(0, Math.floor(offset ?? 0))
}

function normalizeLimit(limit: number | null): number | null {
  if (limit == null) return null
  if (!Number.isFinite(limit)) return null
  const safe = Math.floor(limit)
  return safe > 0 ? safe : null
}

function normalizeStates(states: string[] | null | undefined): string[] | null {
  if (!states || states.length === 0) return null

  const normalized = Array.from(
    new Set(states.map((s) => s.trim().toUpperCase()).filter(Boolean))
  )
  const invalid = normalized.filter((s) => !STATE_RE.test(s))
  if (invalid.length > 0) {
    throw new Error(
      `Invalid states: ${invalid.join(', ')} (expected state codes like CA)`
    )
  }
  return normalized.length > 0 ? normalized : null
}

function maybeTableMissing(error: unknown): boolean {
  if (!isRecord(error)) return false
  const code = typeof error.code === 'string' ? error.code : undefined
  if (code === '42P01') return true
  const message = typeof error.message === 'string' ? error.message : undefined
  if (!message) return false
  return (
    message.includes("Could not find the table 'public.neighborhood_vibes'") ||
    message.includes('schema cache')
  )
}

type StatsState = {
  disabled: boolean
  disableReason?: string
}

async function fetchNeighborhoodStats(
  supabase: SupabaseClient<AppDatabase>,
  neighborhoodId: string,
  logger: Logger,
  state: StatsState
): Promise<NeighborhoodStatsResult | null> {
  if (state.disabled) return null

  const { data, error } = await supabase.rpc('get_neighborhood_stats', {
    neighborhood_uuid: neighborhoodId,
  })

  if (error) {
    const errorMessage = error.message
    const errorCode =
      isRecord(error) && typeof error.code === 'string' ? error.code : undefined

    const isLikelyGlobalBug =
      errorCode === '42702' || errorMessage.includes('is ambiguous')

    if (isLikelyGlobalBug) {
      state.disabled = true
      state.disableReason = errorMessage
      logger.warn(
        '[backfill-neighborhood-vibes] Failed to fetch stats; disabling stats for remainder of run',
        {
          neighborhoodId,
          error: errorMessage,
          code: errorCode,
        }
      )
      return null
    }

    logger.warn('[backfill-neighborhood-vibes] Failed to fetch stats', {
      neighborhoodId,
      error: errorMessage,
      code: errorCode,
    })
    return null
  }

  const candidate = Array.isArray(data) ? data[0] : data
  return isNeighborhoodStatsResult(candidate) ? candidate : null
}

async function buildNeighborhoodContext(
  supabase: SupabaseClient<AppDatabase>,
  neighborhood: NeighborhoodRow,
  sampleLimit: number,
  logger: Logger,
  options: {
    includeStats: boolean
    statsState: StatsState
  }
): Promise<NeighborhoodContext> {
  const includeStats = options.includeStats

  const [{ data: listings, error: listingsError }, listingStats] =
    await Promise.all([
      supabase
        .from('properties')
        .select('address, price, bedrooms, bathrooms, property_type')
        .eq('neighborhood_id', neighborhood.id)
        .limit(sampleLimit),
      includeStats
        ? fetchNeighborhoodStats(
            supabase,
            neighborhood.id,
            logger,
            options.statsState
          )
        : Promise.resolve(null),
    ])

  if (listingsError) {
    logger.warn('[backfill-neighborhood-vibes] Failed to fetch listings', {
      neighborhoodId: neighborhood.id,
      error: listingsError.message,
    })
  }

  const safeListings = (Array.isArray(listings) ? listings : [])
    .map((listing) => {
      if (!isRecord(listing)) return null
      const address =
        typeof listing.address === 'string' ? listing.address : null
      if (!address) return null
      return {
        address,
        price: typeof listing.price === 'number' ? listing.price : null,
        bedrooms:
          typeof listing.bedrooms === 'number' ? listing.bedrooms : null,
        bathrooms:
          typeof listing.bathrooms === 'number' ? listing.bathrooms : null,
        property_type:
          typeof listing.property_type === 'string'
            ? listing.property_type
            : null,
      }
    })
    .filter((listing): listing is NonNullable<typeof listing> =>
      Boolean(listing)
    )

  return {
    neighborhoodId: neighborhood.id,
    name: neighborhood.name,
    city: neighborhood.city,
    state: neighborhood.state,
    metroArea: neighborhood.metro_area,
    medianPrice: neighborhood.median_price,
    walkScore: neighborhood.walk_score,
    transitScore: neighborhood.transit_score,
    listingStats,
    sampleProperties: safeListings.map((p) => ({
      address: p.address,
      price: p.price,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      propertyType: p.property_type,
    })),
  }
}

export async function backfillNeighborhoodVibes(
  args: BackfillNeighborhoodVibesArgs,
  deps: BackfillNeighborhoodVibesDeps
): Promise<BackfillNeighborhoodVibesResult> {
  const logger = deps.logger ?? console
  const sleep = deps.sleep ?? defaultSleep
  const shouldStop = deps.shouldStop ?? (() => false)
  const includeStats = args.includeStats !== false
  const statsState: StatsState = { disabled: false }
  const states = normalizeStates(args.states)

  if (args.neighborhoodIds) {
    const invalid = args.neighborhoodIds.filter((id) => !UUID_RE.test(id))
    if (invalid.length > 0) {
      throw new Error(
        `Invalid neighborhoodIds: ${invalid.join(', ')} (expected UUIDs)`
      )
    }
  }

  const limit = normalizeLimit(args.limit)
  const target = args.neighborhoodIds?.length
    ? args.neighborhoodIds.length
    : (limit ?? Number.POSITIVE_INFINITY)

  const pageSize = Math.max(args.batchSize * 5, 50)
  let offset = normalizeOffset(args.offset)

  let attempted = 0
  let skipped = 0
  let success = 0
  let failed = 0
  let totalCostUsd = 0
  const failures: BackfillNeighborhoodVibesFailure[] = []

  let lastNeighborhoodId: string | null = null
  let canceled = false

  const startTime = Date.now()

  logger.log(
    `[backfill-neighborhood-vibes] Starting (limit=${limit ?? 'all'}, batchSize=${args.batchSize}, delayMs=${args.delayMs}, force=${args.force}, neighborhoodIds=${args.neighborhoodIds?.length ?? 0}, states=${states?.join(',') ?? 'all'}, offset=${args.neighborhoodIds ? 'n/a' : offset}, sampleLimit=${args.sampleLimit}, includeStats=${includeStats})`
  )

  const emitCursor = async () => {
    if (!deps.onCursor || args.neighborhoodIds) return
    try {
      await deps.onCursor({
        offset,
        lastNeighborhoodId,
        attempted,
        skipped,
        success,
        failed,
        totalCostUsd,
      })
    } catch (error) {
      logger.warn(
        `[backfill-neighborhood-vibes] Failed to persist cursor: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  let reachedLimit = false

  while (attempted < target) {
    if (shouldStop()) {
      canceled = true
      break
    }

    const pageStartOffset = offset

    let neighborhoodsQuery = deps.supabase.from('neighborhoods').select('*')

    if (states) {
      neighborhoodsQuery = neighborhoodsQuery.in('state', states)
    }

    if (args.neighborhoodIds) {
      neighborhoodsQuery = neighborhoodsQuery.in('id', args.neighborhoodIds)
    } else {
      neighborhoodsQuery = neighborhoodsQuery
        .order('created_at', { ascending: false })
        .range(pageStartOffset, pageStartOffset + pageSize - 1)
    }

    const { data: rawNeighborhoods, error: neighborhoodsError } =
      await neighborhoodsQuery

    if (neighborhoodsError) {
      throw new Error(
        `Failed to read neighborhoods: ${neighborhoodsError.message}`
      )
    }

    const neighborhoods = rawNeighborhoods ?? []
    if (neighborhoods.length === 0) break

    const neighborhoodIds = neighborhoods.map((n) => n.id)

    const neighborhoodById = new Map(neighborhoods.map((n) => [n.id, n]))
    const orderedNeighborhoods = args.neighborhoodIds
      ? args.neighborhoodIds
          .map((id) => neighborhoodById.get(id))
          .filter((value): value is NeighborhoodRow => Boolean(value))
      : neighborhoods

    const existingSet = new Set<string>()
    if (!args.force) {
      const { data: existing, error: existingError } = await deps.supabase
        .from('neighborhood_vibes')
        .select('neighborhood_id')
        .in('neighborhood_id', neighborhoodIds)

      if (existingError) {
        if (maybeTableMissing(existingError)) {
          throw new Error(
            'neighborhood_vibes table missing (run the neighborhood vibes migration first)'
          )
        }
        throw new Error(
          `Failed to read neighborhood_vibes: ${existingError.message}`
        )
      }

      for (const row of existing || []) {
        existingSet.add(row.neighborhood_id)
      }
    }

    for (let i = 0; i < orderedNeighborhoods.length; i++) {
      if (shouldStop()) {
        canceled = true
        break
      }

      if (attempted >= target) {
        reachedLimit = true
        break
      }

      const neighborhood = orderedNeighborhoods[i]
      lastNeighborhoodId = neighborhood.id

      if (!args.force && existingSet.has(neighborhood.id)) {
        skipped += 1

        if (!args.neighborhoodIds) {
          offset = pageStartOffset + i + 1
          await emitCursor()
        }

        continue
      }

      attempted += 1

      const label = [neighborhood.name, neighborhood.city, neighborhood.state]
        .filter(Boolean)
        .join(', ')

      logger.log(
        `[backfill-neighborhood-vibes] [neighborhood] ${attempted}/${target === Number.POSITIVE_INFINITY ? 'all' : target} id=${neighborhood.id}${label ? ` | ${label}` : ''}`
      )

      try {
        const context = await buildNeighborhoodContext(
          deps.supabase,
          neighborhood,
          args.sampleLimit,
          logger,
          { includeStats, statsState }
        )

        const result =
          await deps.neighborhoodVibesService.generateVibes(context)

        totalCostUsd += result.usage.estimatedCostUsd
        success += 1

        const insertRecord = NeighborhoodVibesService.toInsertRecord(
          result,
          context,
          result.rawOutput
        )

        const { error: upsertError } = await deps.supabase
          .from('neighborhood_vibes')
          .upsert([insertRecord], {
            onConflict: 'neighborhood_id',
            ignoreDuplicates: false,
          })

        if (upsertError) {
          if (maybeTableMissing(upsertError)) {
            throw new Error(
              'neighborhood_vibes table missing (run the neighborhood vibes migration first)'
            )
          }
          logger.error(
            '[backfill-neighborhood-vibes] Failed to upsert vibes:',
            upsertError.message
          )
        }
      } catch (error) {
        failed += 1
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        failures.push({
          neighborhoodId: neighborhood.id,
          name: neighborhood.name ?? null,
          city: neighborhood.city ?? null,
          state: neighborhood.state ?? null,
          error: errorMessage,
          code: error instanceof Error ? error.name : undefined,
        })
        logger.warn(
          `[backfill-neighborhood-vibes] FAILED neighborhood=${neighborhood.id}: ${errorMessage}`
        )
      }

      if (!args.neighborhoodIds) {
        offset = pageStartOffset + i + 1
        await emitCursor()
      }

      if (shouldStop()) {
        canceled = true
        break
      }

      if (args.delayMs > 0) {
        await sleep(args.delayMs)
      }
    }

    if (args.neighborhoodIds) break
    if (canceled || reachedLimit) break
  }

  const totalTimeMs = Date.now() - startTime

  logger.log('[backfill-neighborhood-vibes] Done.')
  logger.log(
    `[backfill-neighborhood-vibes] attempted=${attempted} success=${success} failed=${failed} skipped=${skipped}${canceled ? ' (canceled)' : ''}`
  )
  logger.log(
    `[backfill-neighborhood-vibes] cost=$${totalCostUsd.toFixed(4)} time=${(totalTimeMs / 1000).toFixed(1)}s`
  )

  return {
    attempted,
    skipped,
    success,
    failed,
    totalCostUsd,
    totalTimeMs,
    failures,
    nextOffset: args.neighborhoodIds ? null : offset,
    canceled,
  }
}
