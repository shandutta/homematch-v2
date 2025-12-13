#!/usr/bin/env tsx

/**
 * Resume-friendly runner that repeatedly invokes the vibes backfill in batches
 * until there is nothing left to process (attempted=0) or we detect we're stuck.
 *
 * Recommended:
 *   ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes-resume.ts --limit=200 --force=false --refreshImages=false
 */

import { config } from 'dotenv'
const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile })
// Allow keeping API keys (OpenRouter/RapidAPI) in .env.local while running against prod Supabase via ENV_FILE=.env.prod.
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import fs from 'node:fs/promises'
import path from 'node:path'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import { createVibesService } from '@/lib/services/vibes'
import {
  backfillVibes,
  type BackfillVibesFailure,
} from '@/lib/services/vibes/backfill'

function safeHost(url?: string | null): string {
  if (!url) return ''
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

type Args = {
  limit: number | null
  batchSize: number
  delayMs: number
  force: boolean
  refreshImages: boolean
  forceImages: boolean
  minImages: number
  imageDelayMs: number
  minPrice: number
  maxRuns: number
  pauseMs: number
  stopAfterNoSuccessRuns: number
}

function parseArgs(argv: string[]): Args {
  const defaults: Args = {
    limit: 200,
    batchSize: 10,
    delayMs: 1500,
    force: false,
    refreshImages: false,
    forceImages: false,
    minImages: 10,
    imageDelayMs: 600,
    minPrice: 100000,
    maxRuns: 9999,
    pauseMs: 0,
    stopAfterNoSuccessRuns: 3,
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
  const minPrice = raw.minPrice ? Number(raw.minPrice) : defaults.minPrice
  const maxRuns = raw.maxRuns ? Number(raw.maxRuns) : defaults.maxRuns
  const pauseMs = raw.pauseMs ? Number(raw.pauseMs) : defaults.pauseMs
  const stopAfterNoSuccessRuns = raw.stopAfterNoSuccessRuns
    ? Number(raw.stopAfterNoSuccessRuns)
    : defaults.stopAfterNoSuccessRuns

  return {
    limit: limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? batchSize
        : defaults.batchSize,
    delayMs:
      Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : defaults.delayMs,
    force,
    refreshImages,
    forceImages,
    minImages: Number.isFinite(minImages) && minImages >= 0 ? minImages : 0,
    imageDelayMs:
      Number.isFinite(imageDelayMs) && imageDelayMs >= 0
        ? imageDelayMs
        : defaults.imageDelayMs,
    minPrice:
      Number.isFinite(minPrice) && minPrice >= 0 ? minPrice : defaults.minPrice,
    maxRuns:
      Number.isFinite(maxRuns) && maxRuns > 0 ? maxRuns : defaults.maxRuns,
    pauseMs:
      Number.isFinite(pauseMs) && pauseMs >= 0 ? pauseMs : defaults.pauseMs,
    stopAfterNoSuccessRuns:
      Number.isFinite(stopAfterNoSuccessRuns) && stopAfterNoSuccessRuns > 0
        ? stopAfterNoSuccessRuns
        : defaults.stopAfterNoSuccessRuns,
  }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

async function writeReport(report: Record<string, unknown>) {
  const reportDir = path.join(process.cwd(), '.logs')
  await fs.mkdir(reportDir, { recursive: true })

  const finishedAt = new Date().toISOString()
  const stamp = finishedAt.replace(/[:.]/g, '-')
  const latestPath = path.join(reportDir, 'backfill-vibes-resume-report.json')
  const datedPath = path.join(
    reportDir,
    `backfill-vibes-resume-report-${stamp}.json`
  )

  const payload = { finishedAt, ...report }
  await fs.writeFile(latestPath, JSON.stringify(payload, null, 2))
  await fs.writeFile(datedPath, JSON.stringify(payload, null, 2))

  console.log(
    `[backfill-vibes-resume] Report written: ${path.relative(process.cwd(), latestPath)}`
  )
  console.log(
    `[backfill-vibes-resume] Report archived: ${path.relative(process.cwd(), datedPath)}`
  )
}

async function main() {
  const args = parseArgs(process.argv)

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(`OPENROUTER_API_KEY not set; add to ${envFile}`)
  }

  const supabaseHost = safeHost(process.env.SUPABASE_URL)
  console.log(
    `[backfill-vibes-resume] Env loaded from ${envFile} (supabaseHost=${supabaseHost || 'unknown'})`
  )

  const RAPIDAPI_HOST =
    process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

  if (args.refreshImages && !RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_KEY not set; required for --refreshImages=true')
  }

  const supabase = createStandaloneClient()
  const vibesService = createVibesService()

  const startedAt = Date.now()
  let runs = 0
  let consecutiveNoSuccessRuns = 0

  const totals = {
    attempted: 0,
    skipped: 0,
    success: 0,
    failed: 0,
    totalCostUsd: 0,
    totalTimeMs: 0,
  }
  const failures: BackfillVibesFailure[] = []

  while (runs < args.maxRuns) {
    runs++
    console.log(
      `[backfill-vibes-resume] Run ${runs}/${args.maxRuns} (limit=${args.limit ?? 'all'})`
    )

    const result = await backfillVibes(
      {
        limit: args.limit,
        batchSize: args.batchSize,
        delayMs: args.delayMs,
        force: args.force,
        propertyIds: null,
        refreshImages: args.refreshImages,
        forceImages: args.forceImages,
        minImages: args.minImages,
        imageDelayMs: args.imageDelayMs,
        minPrice: args.minPrice,
      },
      {
        supabase,
        vibesService,
        rapidApiHost: RAPIDAPI_HOST,
        rapidApiKey: RAPIDAPI_KEY,
        sleep,
      }
    )

    totals.attempted += result.attempted
    totals.skipped += result.skipped
    totals.success += result.success
    totals.failed += result.failed
    totals.totalCostUsd += result.totalCostUsd
    totals.totalTimeMs += result.totalTimeMs
    failures.push(...result.failures)

    if (args.limit == null) {
      // Single all-properties run
      break
    }

    if (result.attempted === 0) {
      console.log('[backfill-vibes-resume] Nothing left to process. ✅')
      break
    }

    if (result.success === 0 && result.failed > 0) {
      consecutiveNoSuccessRuns++
      console.warn(
        `[backfill-vibes-resume] No successes this run (${consecutiveNoSuccessRuns}/${args.stopAfterNoSuccessRuns})`
      )
      if (consecutiveNoSuccessRuns >= args.stopAfterNoSuccessRuns) {
        console.warn(
          '[backfill-vibes-resume] Stopping due to repeated no-success runs (likely stuck failures).'
        )
        break
      }
    } else {
      consecutiveNoSuccessRuns = 0
    }

    if (args.pauseMs > 0) {
      await sleep(args.pauseMs)
    }
  }

  const wallTimeMs = Date.now() - startedAt

  try {
    await writeReport({
      envFile,
      supabaseHost,
      args: {
        limit: args.limit,
        batchSize: args.batchSize,
        delayMs: args.delayMs,
        force: args.force,
        refreshImages: args.refreshImages,
        forceImages: args.forceImages,
        minImages: args.minImages,
        imageDelayMs: args.imageDelayMs,
        minPrice: args.minPrice,
        maxRuns: args.maxRuns,
        pauseMs: args.pauseMs,
        stopAfterNoSuccessRuns: args.stopAfterNoSuccessRuns,
      },
      runs,
      totals,
      wallTimeMs,
      failures,
    })
  } catch (err) {
    console.warn(
      `[backfill-vibes-resume] Failed to write report: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  console.log('[backfill-vibes-resume] Done.')
  console.log(
    `[backfill-vibes-resume] runs=${runs} attempted=${totals.attempted} success=${totals.success} failed=${totals.failed} skipped=${totals.skipped}`
  )
  console.log(
    `[backfill-vibes-resume] cost=$${totals.totalCostUsd.toFixed(4)} wallTime=${(wallTimeMs / 1000).toFixed(1)}s`
  )
}

main().catch((err) => {
  console.error('[backfill-vibes-resume] Fatal error:', err)
  process.exit(1)
})
