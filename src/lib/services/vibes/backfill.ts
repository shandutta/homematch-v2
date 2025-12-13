import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchZillowImageUrls,
  isStreetViewImageUrl,
  isZillowStaticImageUrl,
  type FetchZillowImagesOptions,
} from '@/lib/ingestion/zillow-images'
import type { Property } from '@/lib/schemas/property'
import { VibesService, type BatchGenerationResult } from '@/lib/services/vibes'
import type { Database } from '@/types/database'

type Logger = {
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type BackfillVibesArgs = {
  limit: number | null
  batchSize: number
  delayMs: number
  force: boolean
  propertyIds: string[] | null
  refreshImages: boolean
  forceImages: boolean
  minImages: number
  imageDelayMs: number
  offset?: number
  minPrice?: number
}

export type BackfillVibesFailure = {
  propertyId: string
  zpid: string | null
  error: string
  code?: string
}

export type BackfillVibesResult = {
  attempted: number
  skipped: number
  success: number
  failed: number
  totalCostUsd: number
  totalTimeMs: number
  failures: BackfillVibesFailure[]
  nextOffset: number | null
}

export type BackfillVibesDeps = {
  supabase: SupabaseClient<Database>
  vibesService: {
    generateVibesBatch: (
      properties: Property[],
      options?: {
        delayMs?: number
        onProgress?: (completed: number, total: number) => void
        beforeEach?: (
          property: Property,
          index: number,
          total: number
        ) => Promise<Property | void> | Property | void
      }
    ) => Promise<BatchGenerationResult>
  }
  rapidApiKey?: string
  rapidApiHost?: string
  fetchZillowImageUrls?: (
    options: FetchZillowImagesOptions
  ) => Promise<string[]>
  logger?: Logger
  sleep?: (ms: number) => Promise<void>
  now?: () => Date
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function backfillVibes(
  args: BackfillVibesArgs,
  deps: BackfillVibesDeps
): Promise<BackfillVibesResult> {
  const logger = deps.logger ?? console
  const sleep = deps.sleep ?? defaultSleep
  const now = deps.now ?? (() => new Date())

  if (args.propertyIds) {
    const invalid = args.propertyIds.filter((id) => !UUID_RE.test(id))
    if (invalid.length > 0) {
      throw new Error(
        `Invalid propertyIds: ${invalid.join(', ')} (expected UUIDs)`
      )
    }
  }

  const minPrice = args.minPrice ?? 100000
  const rapidApiHost =
    deps.rapidApiHost ?? 'us-housing-market-data1.p.rapidapi.com'
  const rapidApiKey = deps.rapidApiKey

  if (args.refreshImages && !rapidApiKey) {
    throw new Error('rapidApiKey missing; required for --refreshImages=true')
  }

  const fetchImages = deps.fetchZillowImageUrls ?? fetchZillowImageUrls

  const target = args.propertyIds?.length
    ? args.propertyIds.length
    : (args.limit ?? Number.POSITIVE_INFINITY)

  let attempted = 0
  let skipped = 0
  let success = 0
  let failed = 0
  let totalCostUsd = 0
  const startTime = Date.now()
  const failures: BackfillVibesFailure[] = []

  const pageSize = Math.max(args.batchSize * 5, 50)
  let offset =
    Number.isFinite(args.offset) && (args.offset ?? 0) > 0 ? args.offset! : 0

  logger.log(
    `[backfill-vibes] Starting (limit=${args.limit ?? 'all'}, batchSize=${args.batchSize}, delayMs=${args.delayMs}, force=${args.force}, propertyIds=${args.propertyIds?.length ?? 0}, refreshImages=${args.refreshImages}, minImages=${args.minImages}, offset=${args.propertyIds ? 'n/a' : offset})`
  )

  while (attempted < target) {
    const pageStartOffset = offset
    const { data, error } = args.propertyIds
      ? await deps.supabase
          .from('properties')
          .select('*')
          .in('id', args.propertyIds)
      : await deps.supabase
          .from('properties')
          .select('*')
          .not('zpid', 'is', null)
          .gte('price', minPrice)
          .order('created_at', { ascending: false })
          .range(pageStartOffset, pageStartOffset + pageSize - 1)

    if (error) {
      throw new Error(`Failed to read properties: ${error.message}`)
    }

    const properties = (data || []) as Property[]
    if (properties.length === 0) break
    const pageIndexById = new Map(properties.map((p, idx) => [p.id, idx]))

    const ids = properties.map((p) => p.id)
    const propertyById = new Map(properties.map((p) => [p.id, p]))

    const { data: existing } = await deps.supabase
      .from('property_vibes')
      .select('property_id, source_data_hash')
      .in('property_id', ids)

    const existingHashMap = new Map(
      (existing || []).map((v) => [v.property_id, v.source_data_hash])
    )

    const currentHashMap = new Map(
      properties.map((p) => [p.id, VibesService.generateSourceHash(p)])
    )

    const toProcess =
      args.force || args.refreshImages
        ? properties
        : properties.filter(
            (p) => existingHashMap.get(p.id) !== currentHashMap.get(p.id)
          )

    const newlySkipped = args.force ? 0 : properties.length - toProcess.length
    skipped += newlySkipped

    let lastProcessedIndexInPage: number | null = null
    let processedInPage = 0

    for (const batch of chunkArray(toProcess, args.batchSize)) {
      if (attempted >= target) break

      const remaining = target - attempted
      const batchLimited = batch.slice(0, remaining)
      if (batchLimited.length === 0) break

      attempted += batchLimited.length
      processedInPage += batchLimited.length
      const last = batchLimited[batchLimited.length - 1]
      const lastIdx = pageIndexById.get(last.id)
      if (typeof lastIdx === 'number') {
        lastProcessedIndexInPage = lastIdx
      }
      logger.log(
        `[backfill-vibes] Generating batch of ${batchLimited.length} (attempted ${attempted}/${args.propertyIds?.length ?? args.limit ?? 'all'})`
      )

      const batchResult = await deps.vibesService.generateVibesBatch(
        batchLimited,
        {
          delayMs: args.delayMs,
          beforeEach: async (property, index, total) => {
            const zpid = property.zpid
            const imagesCount = Array.isArray(property.images)
              ? property.images.length
              : 0
            const label =
              property.address ||
              [property.city, property.state].filter(Boolean).join(', ')
            logger.log(
              `[backfill-vibes] [property] ${index + 1}/${total} id=${property.id} zpid=${zpid ?? 'null'} imgs=${imagesCount}${label ? ` | ${label}` : ''}`
            )

            if (!args.refreshImages) return
            if (!zpid || !rapidApiKey) return

            const current = Array.isArray(property.images)
              ? property.images
              : []
            const looksComplete =
              current.length >= args.minImages &&
              current.some(
                (u) => typeof u === 'string' && isZillowStaticImageUrl(u)
              )

            if (looksComplete && !args.forceImages) return

            const fetched = await fetchImages({
              zpid,
              rapidApiKey,
              host: rapidApiHost,
            })

            const nonStreetView = fetched.filter(
              (u) => !isStreetViewImageUrl(u)
            )
            const zillowPhotos = nonStreetView.filter(isZillowStaticImageUrl)
            const nextImages =
              zillowPhotos.length > 0 ? zillowPhotos : nonStreetView

            if (nextImages.length === 0) {
              logger.log(
                `[backfill-vibes] [images] zpid=${zpid} no usable photos (skipping image update)`
              )
              return
            }

            const currentMatches =
              current.length === nextImages.length &&
              current.every((u, idx) => u === nextImages[idx])
            if (currentMatches) return

            const { error: updateError } = await deps.supabase
              .from('properties')
              .update({
                images: nextImages,
                updated_at: now().toISOString(),
              })
              .eq('id', property.id)

            if (updateError) {
              logger.warn(
                `[backfill-vibes] [images] Failed to update images for zpid=${zpid} property=${property.id}: ${updateError.message}`
              )
              return
            }

            property.images = nextImages
            const note =
              current.length === nextImages.length ? ' (content changed)' : ''
            logger.log(
              `[backfill-vibes] [images] Updated zpid=${zpid} property=${property.id}: ${current.length} → ${nextImages.length}${note}`
            )

            if (args.imageDelayMs > 0) {
              await sleep(args.imageDelayMs)
            }

            return property
          },
          onProgress: (completed, total) => {
            if (completed === total || completed % 5 === 0) {
              logger.log(
                `[backfill-vibes] Progress ${completed}/${total} in current batch`
              )
            }
          },
        }
      )

      success += batchResult.success.length
      failed += batchResult.failed.length
      totalCostUsd += batchResult.totalCostUsd

      if (batchResult.failed.length > 0) {
        for (const f of batchResult.failed) {
          const p = propertyById.get(f.propertyId)
          failures.push({
            propertyId: f.propertyId,
            zpid: p?.zpid ?? null,
            error: f.error,
            code: f.code,
          })
          logger.warn(
            `[backfill-vibes] FAILED property=${f.propertyId} zpid=${p?.zpid ?? 'null'}: ${f.error}`
          )
        }
      }

      const insertRecords = batchResult.success.map((r) => {
        const property = batchLimited.find((p) => p.id === r.propertyId)
        if (!property) {
          throw new Error(`Missing property for result ${r.propertyId}`)
        }
        return VibesService.toInsertRecord(r, property, r.rawOutput)
      })

      if (insertRecords.length > 0) {
        const { error: upsertError } = await deps.supabase
          .from('property_vibes')
          .upsert(insertRecords, {
            onConflict: 'property_id',
            ignoreDuplicates: false,
          })

        if (upsertError) {
          logger.error(
            '[backfill-vibes] Failed to upsert vibes:',
            upsertError.message
          )
        }
      }

      if (attempted >= target) break
    }

    if (!args.propertyIds) {
      if (
        attempted >= target &&
        processedInPage < toProcess.length &&
        lastProcessedIndexInPage != null
      ) {
        offset = pageStartOffset + lastProcessedIndexInPage + 1
      } else {
        offset = pageStartOffset + properties.length
      }
    }

    if (args.propertyIds) break
  }

  const totalTimeMs = Date.now() - startTime
  logger.log('[backfill-vibes] Done.')
  logger.log(
    `[backfill-vibes] attempted=${attempted} success=${success} failed=${failed} skipped=${skipped}`
  )
  logger.log(
    `[backfill-vibes] cost=$${totalCostUsd.toFixed(4)} time=${(totalTimeMs / 1000).toFixed(1)}s`
  )

  return {
    attempted,
    skipped,
    success,
    failed,
    totalCostUsd,
    totalTimeMs,
    failures,
    nextOffset: args.propertyIds ? null : offset,
  }
}
