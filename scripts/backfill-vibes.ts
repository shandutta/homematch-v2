#!/usr/bin/env tsx

/**
 * Backfill property vibes for existing properties.
 *
 * Safe defaults for manual runs:
 *   pnpm exec tsx scripts/backfill-vibes.ts --limit=10
 *
 * Options:
 *   --limit=10        Max properties to attempt (default 10; omit for all)
 *   --batchSize=10    How many to send per batch (default 10)
 *   --delayMs=1500    Delay between properties in a batch (default 1500)
 *   --force=true      Ignore source hash and regenerate
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'
import { createVibesService, VibesService } from '@/lib/services/vibes'
import type { Property } from '@/lib/schemas/property'

type Args = {
  limit: number | null
  batchSize: number
  delayMs: number
  force: boolean
}

function parseArgs(argv: string[]): Args {
  const defaults: Args = {
    limit: 10,
    batchSize: 10,
    delayMs: 1500,
    force: false,
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

  return {
    limit: limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? batchSize
        : defaults.batchSize,
    delayMs:
      Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : defaults.delayMs,
    force,
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

async function main() {
  const args = parseArgs(process.argv)

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set; add to .env.local')
  }

  const supabase = createStandaloneClient()
  const vibesService = createVibesService()

  const target = args.limit ?? Number.POSITIVE_INFINITY

  let attempted = 0
  let skipped = 0
  let success = 0
  let failed = 0
  let totalCostUsd = 0
  const startTime = Date.now()

  const pageSize = Math.max(args.batchSize * 5, 50)
  let offset = 0

  console.log(
    `[backfill-vibes] Starting (limit=${args.limit ?? 'all'}, batchSize=${args.batchSize}, delayMs=${args.delayMs}, force=${args.force})`
  )

  while (attempted < target) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .not('images', 'is', null)
      .gte('price', 100000)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Failed to read properties: ${error.message}`)
    }

    const properties = (data || []) as Property[]
    if (properties.length === 0) break
    offset += pageSize

    const ids = properties.map((p) => p.id)
    const currentHashMap = new Map(
      properties.map((p) => [p.id, VibesService.generateSourceHash(p)])
    )

    const { data: existing } = await supabase
      .from('property_vibes')
      .select('property_id, source_data_hash')
      .in('property_id', ids)

    const existingHashMap = new Map(
      (existing || []).map((v) => [v.property_id, v.source_data_hash])
    )

    const toProcess = args.force
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
        `[backfill-vibes] Generating batch of ${batchLimited.length} (attempted ${attempted}/${args.limit ?? 'all'})`
      )

      const batchResult = await vibesService.generateVibesBatch(batchLimited, {
        delayMs: args.delayMs,
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
  }

  const totalTimeMs = Date.now() - startTime
  console.log('[backfill-vibes] Done.')
  console.log(
    `[backfill-vibes] attempted=${attempted} success=${success} failed=${failed} skipped=${skipped}`
  )
  console.log(
    `[backfill-vibes] cost=$${totalCostUsd.toFixed(4)} time=${(totalTimeMs / 1000).toFixed(1)}s`
  )
}

main().catch((err) => {
  console.error('[backfill-vibes] Fatal error:', err)
  process.exit(1)
})
