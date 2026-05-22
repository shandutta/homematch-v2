import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchZillowImageUrls,
  isStreetViewImageUrl,
  isZillowStaticImageUrl,
  type FetchZillowImagesOptions,
} from '@/lib/ingestion/zillow-images'
import {
  fetchZillowProperty as defaultFetchZillowProperty,
  extractPropertyMetadata,
} from '@/lib/ingestion/zillow-property'
import type { ZillowPropertyResponse } from '@/app/api/admin/generate-vibes-zillow/extract-amenities'
import { propertySchema, type Property } from '@/lib/schemas/property'
import { VibesService, type BatchGenerationResult } from '@/lib/services/vibes'
import type { AppDatabase } from '@/types/app-database'
import type { TablesInsert } from '@/types/database'

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
  refreshMetadata: boolean
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
  supabase: SupabaseClient<AppDatabase>
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
  fetchZillowProperty?: (options: {
    zpid: string
    rapidApiKey: string
    host?: string
  }) => Promise<ZillowPropertyResponse>
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
  if (args.refreshMetadata && !rapidApiKey) {
    throw new Error('rapidApiKey missing; required for --refreshMetadata=true')
  }

  const fetchImages = deps.fetchZillowImageUrls ?? fetchZillowImageUrls
  const fetchProperty = deps.fetchZillowProperty ?? defaultFetchZillowProperty
  // Both image and metadata refresh use the per-property scan path (refresh →
  // per-property regenerate decision). Plain vibes-only runs (nightly cron)
  // keep the simpler batch path.
  const perPropertyMode = args.refreshImages || args.refreshMetadata

  const target = args.propertyIds?.length
    ? args.propertyIds.length
    : (args.limit ?? Number.POSITIVE_INFINITY)

  let attempted = 0
  let scanned = 0
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
          .select(
            'address, amenities, bathrooms, bedrooms, city, coordinates, created_at, description, id, images, is_active, listing_status, lot_size_sqft, neighborhood_id, parking_spots, price, property_hash, property_type, square_feet, state, updated_at, year_built, zip_code, zillow_images_refreshed_at, zillow_images_refreshed_count, zillow_images_refresh_status, zpid'
          )
          .in('id', args.propertyIds)
      : await deps.supabase
          .from('properties')
          .select(
            'address, amenities, bathrooms, bedrooms, city, coordinates, created_at, description, id, images, is_active, listing_status, lot_size_sqft, neighborhood_id, parking_spots, price, property_hash, property_type, square_feet, state, updated_at, year_built, zip_code, zillow_images_refreshed_at, zillow_images_refreshed_count, zillow_images_refresh_status, zpid'
          )
          .not('zpid', 'is', null)
          .gte('price', minPrice)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(pageStartOffset, pageStartOffset + pageSize - 1)

    if (error) {
      throw new Error(`Failed to read properties: ${error.message}`)
    }

    // Parse per-row instead of the whole array: a single schema-invalid row
    // (e.g. a legacy listing with an out-of-range field) must not abort the
    // entire backfill. Skip + warn the bad ones; the offset still advances by
    // the raw row count so pagination never stalls or re-loops.
    const rawRows: unknown[] = data ?? []
    const pageRowCount = rawRows.length
    if (pageRowCount === 0) break

    const properties: Property[] = []
    let invalidInPage = 0
    for (const row of rawRows) {
      const rec =
        row && typeof row === 'object'
          ? // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (row as Record<string, unknown>)
          : null
      // The DB allows NULL bedrooms/bathrooms (≈1,387 active rows have null
      // bathrooms) but propertySchema requires a number with 0 as the
      // documented "unknown" sentinel. Coerce null -> 0 so these rows aren't
      // skipped; refreshMetadata overwrites with the real Zillow value below.
      if (rec) {
        if (rec.bedrooms === null) rec.bedrooms = 0
        if (rec.bathrooms === null) rec.bathrooms = 0
      }
      const parsed = propertySchema.safeParse(row)
      if (parsed.success) {
        properties.push(parsed.data)
        continue
      }
      invalidInPage++
      const rowId = rec && rec.id != null ? String(rec.id) : 'unknown'
      const issue = parsed.error.issues[0]
      logger.warn(
        `[backfill-vibes] Skipping invalid property id=${rowId}: ${
          issue
            ? `${issue.path.join('.') || '(root)'} — ${issue.message}`
            : 'schema validation failed'
        }`
      )
    }
    if (invalidInPage > 0) {
      logger.warn(
        `[backfill-vibes] Skipped ${invalidInPage}/${pageRowCount} invalid properties in this page`
      )
    }
    if (properties.length === 0) {
      // Whole page was invalid; advance past it and continue (don't break,
      // which would prematurely end a paginated full run).
      if (args.propertyIds) break
      offset = pageStartOffset + pageRowCount
      continue
    }
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

    let toProcess = properties
    if (!args.force && !perPropertyMode) {
      const delta = properties.filter(
        (p) => existingHashMap.get(p.id) !== currentHashMap.get(p.id)
      )
      skipped += properties.length - delta.length
      toProcess = delta
    }

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

      if (!perPropertyMode) {
        logger.log(
          `[backfill-vibes] Generating batch of ${batchLimited.length} (attempted ${attempted}/${args.propertyIds?.length ?? args.limit ?? 'all'})`
        )
      } else {
        logger.log(
          `[backfill-vibes] Processing batch of ${batchLimited.length} properties (scanned ${attempted}/${args.propertyIds?.length ?? args.limit ?? 'all'})`
        )
      }

      const imagesChangedByPropertyId = new Map<string, boolean>()
      const imageUpdatePayloads: {
        id: string
        willUpdateImages: boolean
        nextImages: string[]
        nowIso: string
        zillow_images_refreshed_count: number
        zillow_images_refresh_status: 'ok' | 'no_images'
      }[] = []
      const metadataUpdatePayloads: Array<
        Record<string, unknown> & { id: string }
      > = []

      const maybeRefreshImages = async (property: Property): Promise<void> => {
        if (!args.refreshImages) return
        const zpid = property.zpid
        if (!zpid || !rapidApiKey) return

        const current = Array.isArray(property.images) ? property.images : []
        const hasZillowPhotos = current.some(
          (u) => typeof u === 'string' && isZillowStaticImageUrl(u)
        )
        const looksComplete =
          current.length >= args.minImages && hasZillowPhotos

        const refreshedAt = property.zillow_images_refreshed_at
        const refreshedCount = property.zillow_images_refreshed_count
        const refreshedStatus = property.zillow_images_refresh_status

        const hasRefreshMarker =
          typeof refreshedAt === 'string' && refreshedAt.length > 0
        const shouldSkipDueToMarker =
          !args.forceImages &&
          hasRefreshMarker &&
          (hasZillowPhotos || refreshedStatus === 'no_images')

        if (shouldSkipDueToMarker) {
          logger.log(
            `[backfill-vibes] [images] Skip refresh zpid=${zpid} property=${property.id}: marker=(${refreshedStatus ?? 'unknown'}, ${refreshedCount ?? 'null'} imgs, ${refreshedAt})`
          )
          imagesChangedByPropertyId.set(property.id, false)
          return
        }

        if (looksComplete && !args.forceImages) {
          imagesChangedByPropertyId.set(property.id, false)
          return
        }

        const fetched = await fetchImages({
          zpid,
          rapidApiKey,
          host: rapidApiHost,
        })

        const nonStreetView = fetched.filter((u) => !isStreetViewImageUrl(u))
        const zillowPhotos = nonStreetView.filter(isZillowStaticImageUrl)
        const nextImages =
          zillowPhotos.length > 0 ? zillowPhotos : nonStreetView

        const currentMatches =
          current.length === nextImages.length &&
          current.every((u, idx) => u === nextImages[idx])
        const markerStatus: 'ok' | 'no_images' =
          nextImages.length === 0 ? 'no_images' : 'ok'
        const nowIso = now().toISOString()

        const markerAlreadySet =
          typeof property.zillow_images_refreshed_at === 'string' &&
          property.zillow_images_refreshed_at.length > 0 &&
          property.zillow_images_refreshed_count === nextImages.length &&
          property.zillow_images_refresh_status === markerStatus

        if (currentMatches && markerAlreadySet) {
          imagesChangedByPropertyId.set(property.id, false)
          return
        }

        const willUpdateImages = nextImages.length > 0 && !currentMatches

        // Defer DB write — collect for batch upsert after the property loop
        imageUpdatePayloads.push({
          id: property.id,
          willUpdateImages,
          nextImages,
          nowIso,
          zillow_images_refreshed_count: nextImages.length,
          zillow_images_refresh_status: markerStatus,
        })

        // Mutate property in-place for downstream vibes generation
        if (willUpdateImages) {
          property.images = nextImages
          imagesChangedByPropertyId.set(property.id, true)
        } else {
          imagesChangedByPropertyId.set(property.id, false)
        }
        property.zillow_images_refreshed_at = nowIso
        property.zillow_images_refreshed_count = nextImages.length
        property.zillow_images_refresh_status = markerStatus

        if (nextImages.length === 0) {
          logger.log(
            `[backfill-vibes] [images] Refreshed zpid=${zpid} property=${property.id}: no usable photos (marked no_images)`
          )
        } else if (currentMatches) {
          logger.log(
            `[backfill-vibes] [images] Refreshed zpid=${zpid} property=${property.id}: images unchanged (marked ok, ${nextImages.length} imgs)`
          )
        } else {
          const note =
            current.length === nextImages.length ? ' (content changed)' : ''
          logger.log(
            `[backfill-vibes] [images] Updated zpid=${zpid} property=${property.id}: ${current.length} → ${nextImages.length}${note}`
          )
        }

        if (args.imageDelayMs > 0) {
          await sleep(args.imageDelayMs)
        }
      }

      const maybeRefreshMetadata = async (
        property: Property
      ): Promise<void> => {
        if (!args.refreshMetadata) return
        const zpid = property.zpid
        if (!zpid || !rapidApiKey) return

        let raw: ZillowPropertyResponse
        try {
          raw = await fetchProperty({ zpid, rapidApiKey, host: rapidApiHost })
        } catch (err) {
          logger.warn(
            `[backfill-vibes] [meta] Fetch failed zpid=${zpid} property=${property.id}: ${err instanceof Error ? err.message : String(err)}`
          )
          if (args.imageDelayMs > 0) await sleep(args.imageDelayMs)
          return
        }

        const md = extractPropertyMetadata(raw)

        // Merge into the in-memory property so downstream vibes generation and
        // generateSourceHash see the enriched data. Never overwrite a good
        // existing value with a null fetch.
        if (md.description !== null) property.description = md.description
        if (md.amenities !== null) property.amenities = md.amenities
        if (md.year_built !== null) property.year_built = md.year_built
        if (md.lot_size_sqft !== null) property.lot_size_sqft = md.lot_size_sqft
        if (md.square_feet !== null) property.square_feet = md.square_feet
        property.property_type = md.property_type
        property.listing_status = md.listing_status
        if (typeof md.price === 'number' && md.price > 0)
          property.price = md.price
        if (md.bedrooms !== null) property.bedrooms = md.bedrooms
        if (md.bathrooms !== null) property.bathrooms = md.bathrooms
        if (md.address) property.address = md.address
        if (md.city) property.city = md.city
        if (md.state) property.state = md.state
        if (md.zip_code) property.zip_code = md.zip_code
        // Listing-enrichment fields — assigned directly (incl. null) since each
        // fetch reflects current reality (price cuts, relisting, etc.).
        property.price_history = md.price_history
        property.tax_history = md.tax_history
        property.schools = md.schools
        property.zestimate = md.zestimate
        property.rent_zestimate = md.rent_zestimate
        property.listed_at = md.listed_at
        property.days_on_market = md.days_on_market
        property.hoa_fee = md.hoa_fee
        property.broker_name = md.broker_name
        property.agent_name = md.agent_name

        // Collect a DB upsert payload (only refreshed columns + updated_at).
        // Separate from the image upsert so each touches only its own columns.
        metadataUpdatePayloads.push({
          id: property.id,
          updated_at: now().toISOString(),
          description: property.description,
          amenities: property.amenities,
          year_built: property.year_built,
          lot_size_sqft: property.lot_size_sqft,
          square_feet: property.square_feet,
          property_type: property.property_type,
          listing_status: property.listing_status,
          price: property.price,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          address: property.address,
          city: property.city,
          state: property.state,
          zip_code: property.zip_code,
          price_history: property.price_history,
          tax_history: property.tax_history,
          schools: property.schools,
          zestimate: property.zestimate,
          rent_zestimate: property.rent_zestimate,
          listed_at: property.listed_at,
          days_on_market: property.days_on_market,
          hoa_fee: property.hoa_fee,
          broker_name: property.broker_name,
          agent_name: property.agent_name,
        })

        logger.log(
          `[backfill-vibes] [meta] zpid=${zpid} property=${property.id}: desc=${property.description ? 'y' : 'n'} amenities=${Array.isArray(property.amenities) ? property.amenities.length : 0} year=${property.year_built ?? 'null'} status=${property.listing_status}`
        )

        if (args.imageDelayMs > 0) await sleep(args.imageDelayMs)
      }

      const toGenerate: Property[] = []
      if (perPropertyMode) scanned += batchLimited.length

      for (let i = 0; i < batchLimited.length; i++) {
        const property = batchLimited[i]
        const zpid = property.zpid
        const imagesCount = Array.isArray(property.images)
          ? property.images.length
          : 0
        const label =
          property.address ||
          [property.city, property.state].filter(Boolean).join(', ')

        logger.log(
          `[backfill-vibes] [property] ${i + 1}/${batchLimited.length} id=${property.id} zpid=${zpid ?? 'null'} imgs=${imagesCount}${label ? ` | ${label}` : ''}`
        )

        await maybeRefreshMetadata(property)
        await maybeRefreshImages(property)

        if (!perPropertyMode) continue

        const hasExisting = existingHashMap.has(property.id)
        const existingHash = existingHashMap.get(property.id)
        const newHash = VibesService.generateSourceHash(property)
        const imagesChanged =
          imagesChangedByPropertyId.get(property.id) === true
        const stale = hasExisting && existingHash !== newHash

        const shouldGenerate =
          args.force || !hasExisting || stale || imagesChanged

        if (!shouldGenerate) {
          skipped++
          logger.log(
            `[backfill-vibes] [vibes] Skip property=${property.id} zpid=${zpid ?? 'null'}: up-to-date`
          )
          continue
        }

        const reasons: string[] = []
        if (!hasExisting) reasons.push('missing')
        if (stale) reasons.push('stale')
        if (imagesChanged) reasons.push('images_changed')
        if (args.force) reasons.push('force')

        logger.log(
          `[backfill-vibes] [vibes] Generate property=${property.id} zpid=${zpid ?? 'null'}: ${reasons.join(', ') || 'unknown'}`
        )
        toGenerate.push(property)
      }

      // Batch upsert refreshed metadata (one round-trip). Each row carries
      // only the refreshed columns + id, so on conflict it updates exactly
      // those columns (description/amenities/year_built/etc.) and leaves the
      // image columns to the separate image upsert below.
      if (metadataUpdatePayloads.length > 0) {
        const metaRows = metadataUpdatePayloads
        const { error: metaErr } = await deps.supabase
          .from('properties')
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          .upsert(metaRows as unknown as TablesInsert<'properties'>[])
        if (metaErr) {
          // A batch upsert is atomic — one bad row (e.g. a constraint
          // violation) loses the whole batch's metadata. Fall back to per-row
          // UPDATEs so the rest still persist and we learn which row failed.
          logger.warn(
            `[backfill-vibes] [meta] Batch metadata upsert failed (${metaErr.message}); retrying per-row`
          )
          for (const payload of metadataUpdatePayloads) {
            const { error: rowErr } = await deps.supabase
              .from('properties')
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              .update(payload as unknown as TablesInsert<'properties'>)
              .eq('id', payload.id)
            if (rowErr) {
              logger.warn(
                `[backfill-vibes] [meta] Per-row metadata update failed for property=${payload.id}: ${rowErr.message}`
              )
            }
          }
        }
      }

      // Persist image refresh via per-row UPDATEs (NOT upsert). These payloads
      // carry only image columns + id; an upsert evaluates NOT NULL on its
      // insert-attempt tuple — and `address` is NOT NULL — so it errors 23502
      // even though the row already exists, silently losing every image. UPDATE
      // touches only the provided columns, sidestepping that. (42703 = the
      // refresh-marker columns are absent in this env → retry images-only.)
      for (const u of imageUpdatePayloads) {
        const payload: Record<string, unknown> = {
          updated_at: u.nowIso,
          zillow_images_refreshed_at: u.nowIso,
          zillow_images_refreshed_count: u.zillow_images_refreshed_count,
          zillow_images_refresh_status: u.zillow_images_refresh_status,
          ...(u.willUpdateImages ? { images: u.nextImages } : {}),
        }
        const { error: updErr } = await deps.supabase
          .from('properties')
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          .update(payload as unknown as TablesInsert<'properties'>)
          .eq('id', u.id)
        if (updErr?.code === '42703' && u.willUpdateImages) {
          const { error: imgErr } = await deps.supabase
            .from('properties')
            .update({ images: u.nextImages, updated_at: u.nowIso })
            .eq('id', u.id)
          if (imgErr) {
            logger.warn(
              `[backfill-vibes] [images] Image update failed for property=${u.id}: ${imgErr.message}`
            )
          }
        } else if (updErr && updErr.code !== '42703') {
          logger.warn(
            `[backfill-vibes] [images] Image update failed for property=${u.id}: ${updErr.message}`
          )
        }
      }

      const batchResult = perPropertyMode
        ? toGenerate.length > 0
          ? await deps.vibesService.generateVibesBatch(toGenerate, {
              delayMs: args.delayMs,
              onProgress: (completed, total) => {
                if (completed === total || completed % 5 === 0) {
                  logger.log(
                    `[backfill-vibes] Progress ${completed}/${total} in current vibes batch`
                  )
                }
              },
            })
          : {
              success: [],
              failed: [],
              totalCostUsd: 0,
              totalTimeMs: 0,
            }
        : await deps.vibesService.generateVibesBatch(batchLimited, {
            delayMs: args.delayMs,
            onProgress: (completed, total) => {
              if (completed === total || completed % 5 === 0) {
                logger.log(
                  `[backfill-vibes] Progress ${completed}/${total} in current batch`
                )
              }
            },
          })

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
        const property = propertyById.get(r.propertyId)
        if (!property)
          throw new Error(`Missing property for result ${r.propertyId}`)
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
        offset = pageStartOffset + pageRowCount
      }
    }

    if (args.propertyIds) break
  }

  const totalTimeMs = Date.now() - startTime
  logger.log('[backfill-vibes] Done.')
  logger.log(
    `[backfill-vibes] attempted=${attempted} success=${success} failed=${failed} skipped=${skipped}${args.refreshImages ? ` scanned=${scanned}` : ''}`
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
