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
import { createVibesService } from '@/lib/services/vibes'
import { backfillVibes } from '@/lib/services/vibes/backfill'

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

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

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

  const result = await backfillVibes(args, {
    supabase,
    vibesService,
    rapidApiHost: RAPIDAPI_HOST,
    rapidApiKey: RAPIDAPI_KEY,
    sleep,
  })

  try {
    const reportDir = path.join(process.cwd(), '.logs')
    await fs.mkdir(reportDir, { recursive: true })
    const reportPath = path.join(reportDir, 'backfill-vibes-report.json')
    await fs.writeFile(
      reportPath,
      JSON.stringify(
        {
          finishedAt: new Date().toISOString(),
          attempted: result.attempted,
          success: result.success,
          failed: result.failed,
          skipped: result.skipped,
          totalCostUsd: result.totalCostUsd,
          failures: result.failures,
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
