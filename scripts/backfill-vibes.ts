#!/usr/bin/env tsx

/**
 * Backfill property vibes for existing properties.
 *
 * Safe defaults for manual runs:
 *   pnpm exec tsx scripts/backfill-vibes.ts --limit=10 --force=true --refreshImages=true
 *
 * Options:
 *   --limit=10        Max properties to attempt (default 10; omit for all)
 *   --batchSize=10    How many to send per batch (default 10)
 *   --delayMs=1500    Delay between properties in a batch (default 1500)
 *   --force=true      Ignore source hash and regenerate
 *   --refreshImages=true   Fetch full Zillow gallery via RapidAPI /images?zpid= and update `properties.images`
 *   --forceImages=true     Update `properties.images` even if it already looks complete
 *   --minImages=10         Skip refresh when current images >= this count (default 10)
 *   --imageDelayMs=600     Delay between image fetches (default 600)
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import fs from 'node:fs/promises'
import path from 'node:path'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import {
  fetchZillowImageUrls,
  isStreetViewImageUrl,
  isZillowStaticImageUrl,
} from '@/lib/ingestion/zillow-images'
import { createVibesService, VibesService } from '@/lib/services/vibes'
import type { Property } from '@/lib/schemas/property'

type Args = {
  limit: number | null
  batchSize: number
  delayMs: number
  force: boolean
  propertyIds: string[] | null
  refreshImages: boolean
  forceImages: boolean
  minImages: number
  imageDelayMs: number
}

function parseArgs(argv: string[]): Args {
  const defaults: Args = {
    limit: 10,
    batchSize: 10,
    delayMs: 1500,
    force: false,
    propertyIds: null,
    refreshImages: false,
    forceImages: false,
    minImages: 10,
    imageDelayMs: 600,
  }

  const raw: Record<string, string> = {}
  argv.slice(2).forEach((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=')
    if (k && v != null) raw[k] = v
  })

  const limit =
    raw.limit != null
      ? Number(raw.limit)
      : raw.all === 'true'
        ? null
        : defaults.limit
  const batchSize = raw.batchSize ? Number(raw.batchSize) : defaults.batchSize
  const delayMs = raw.delayMs ? Number(raw.delayMs) : defaults.delayMs
  const force = raw.force === 'true' || defaults.force
  const propertyIds =
    raw.propertyIds != null
      ? raw.propertyIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : defaults.propertyIds
  const refreshImages =
    raw.refreshImages != null
      ? raw.refreshImages === 'true'
      : defaults.refreshImages
  const forceImages =
    raw.forceImages != null ? raw.forceImages === 'true' : defaults.forceImages
  const minImages = raw.minImages ? Number(raw.minImages) : defaults.minImages
  const imageDelayMs = raw.imageDelayMs
    ? Number(raw.imageDelayMs)
    : defaults.imageDelayMs

  return {
    limit: limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? batchSize
        : defaults.batchSize,
    delayMs:
      Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : defaults.delayMs,
    force,
    propertyIds: propertyIds && propertyIds.length > 0 ? propertyIds : null,
    refreshImages,
    forceImages,
    minImages: Number.isFinite(minImages) && minImages >= 0 ? minImages : 0,
    imageDelayMs:
      Number.isFinite(imageDelayMs) && imageDelayMs >= 0
        ? imageDelayMs
        : defaults.imageDelayMs,
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const args = parseArgs(process.argv)

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set; add to .env.local')
  }

  const RAPIDAPI_HOST =
    process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

  if (args.refreshImages && !RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_KEY not set; required for --refreshImages=true')
  }

  const supabase = createStandaloneClient()
  const vibesService = createVibesService()

  const target = args.propertyIds?.length
    ? args.propertyIds.length
    : (args.limit ?? Number.POSITIVE_INFINITY)

  let attempted = 0
  let skipped = 0
  let success = 0
  let failed = 0
  let totalCostUsd = 0
  const startTime = Date.now()
  const reportFailures: Array<{
    propertyId: string
    zpid: string | null
    error: string
    code?: string
  }> = []

  const pageSize = Math.max(args.batchSize * 5, 50)
  let offset = 0

  console.log(
    `[backfill-vibes] Starting (limit=${args.limit ?? 'all'}, batchSize=${args.batchSize}, delayMs=${args.delayMs}, force=${args.force}, propertyIds=${args.propertyIds?.length ?? 0}, refreshImages=${args.refreshImages}, minImages=${args.minImages})`
  )

  while (attempted < target) {
    const { data, error } = args.propertyIds
      ? await supabase.from('properties').select('*').in('id', args.propertyIds)
      : await supabase
          .from('properties')
          .select('*')
          .not('zpid', 'is', null)
          .gte('price', 100000)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Failed to read properties: ${error.message}`)
    }

    const properties = (data || []) as Property[]
    if (properties.length === 0) break
    if (!args.propertyIds) {
      offset += pageSize
    }

    const ids = properties.map((p) => p.id)
    const propertyById = new Map(properties.map((p) => [p.id, p]))

    const { data: existing } = await supabase
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

    for (const batch of chunkArray(toProcess, args.batchSize)) {
      if (attempted >= target) break

      const remaining = target - attempted
      const batchLimited = batch.slice(0, remaining)
      if (batchLimited.length === 0) break

      attempted += batchLimited.length
      console.log(
        `[backfill-vibes] Generating batch of ${batchLimited.length} (attempted ${attempted}/${args.propertyIds?.length ?? args.limit ?? 'all'})`
      )

      const batchResult = await vibesService.generateVibesBatch(batchLimited, {
        delayMs: args.delayMs,
        beforeEach: args.refreshImages
          ? async (property) => {
              const zpid = property.zpid
              if (!zpid || !RAPIDAPI_KEY) return

              const current = Array.isArray(property.images)
                ? property.images
                : []
              const looksComplete =
                current.length >= args.minImages &&
                current.some(
                  (u) => typeof u === 'string' && isZillowStaticImageUrl(u)
                )

              if (looksComplete && !args.forceImages) return

              const fetched = await fetchZillowImageUrls({
                zpid,
                rapidApiKey: RAPIDAPI_KEY,
                host: RAPIDAPI_HOST,
              })

              const nonStreetView = fetched.filter(
                (u) => !isStreetViewImageUrl(u)
              )
              const zillowPhotos = nonStreetView.filter(isZillowStaticImageUrl)
              const nextImages =
                zillowPhotos.length > 0 ? zillowPhotos : nonStreetView

              if (nextImages.length === 0) {
                console.log(
                  `[backfill-vibes] [images] zpid=${zpid} no usable photos (skipping image update)`
                )
                return
              }

              const shouldUpdate =
                args.forceImages || nextImages.length !== current.length
              if (!shouldUpdate) return

              const { error: updateError } = await supabase
                .from('properties')
                .update({
                  images: nextImages,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', property.id)

              if (updateError) {
                console.warn(
                  `[backfill-vibes] [images] Failed to update images for zpid=${zpid} property=${property.id}: ${updateError.message}`
                )
                return
              }

              property.images = nextImages
              console.log(
                `[backfill-vibes] [images] Updated zpid=${zpid} property=${property.id}: ${current.length} → ${nextImages.length}`
              )

              if (args.imageDelayMs > 0) {
                await sleep(args.imageDelayMs)
              }

              return property
            }
          : undefined,
        onProgress: (completed, total) => {
          if (completed === total || completed % 5 === 0) {
            console.log(
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
          reportFailures.push({
            propertyId: f.propertyId,
            zpid: p?.zpid ?? null,
            error: f.error,
            code: f.code,
          })
          console.warn(
            `[backfill-vibes] FAILED property=${f.propertyId} zpid=${p?.zpid ?? 'null'}: ${f.error}`
          )
        }
      }

      const insertRecords = batchResult.success.map((r) => {
        const property = batchLimited.find((p) => p.id === r.propertyId)
        if (!property) {
          throw new Error(`Missing property for result ${r.propertyId}`)
        }
        return VibesService.toInsertRecord(r, property, JSON.stringify(r.vibes))
      })

      if (insertRecords.length > 0) {
        const { error: upsertError } = await supabase
          .from('property_vibes')
          .upsert(insertRecords, {
            onConflict: 'property_id',
            ignoreDuplicates: false,
          })

        if (upsertError) {
          console.error(
            '[backfill-vibes] Failed to upsert vibes:',
            upsertError.message
          )
        }
      }

      if (attempted >= target) break
    }

    if (args.propertyIds) {
      break
    }
  }

  const totalTimeMs = Date.now() - startTime
  console.log('[backfill-vibes] Done.')
  console.log(
    `[backfill-vibes] attempted=${attempted} success=${success} failed=${failed} skipped=${skipped}`
  )
  console.log(
    `[backfill-vibes] cost=$${totalCostUsd.toFixed(4)} time=${(totalTimeMs / 1000).toFixed(1)}s`
  )

  try {
    const reportDir = path.join(process.cwd(), '.logs')
    await fs.mkdir(reportDir, { recursive: true })
    const reportPath = path.join(reportDir, 'backfill-vibes-report.json')
    await fs.writeFile(
      reportPath,
      JSON.stringify(
        {
          finishedAt: new Date().toISOString(),
          attempted,
          success,
          failed,
          skipped,
          totalCostUsd,
          failures: reportFailures,
        },
        null,
        2
      )
    )
    console.log(
      `[backfill-vibes] Report written: ${path.relative(process.cwd(), reportPath)}`
    )
  } catch (err) {
    console.warn(
      `[backfill-vibes] Failed to write report: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

main().catch((err) => {
  console.error('[backfill-vibes] Fatal error:', err)
  process.exit(1)
})
