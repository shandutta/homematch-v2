#!/usr/bin/env tsx

/**
 * Resume-friendly runner that repeatedly invokes the vibes backfill in batches
 * until there is nothing left to process (attempted=0) or we detect we're stuck.
 *
 * Recommended:
 *   ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes-resume.ts --limit=200
 *
 * Full refresh (regen vibes + refresh images, cursor-based):
 *   ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes-resume.ts --limit=200 --fullRefresh=true
 */

import { config } from 'dotenv'
const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile, override: true })
for (const key of ['OPENROUTER_API_KEY', 'RAPIDAPI_KEY']) {
  if (process.env[key] != null && process.env[key].trim() === '') {
    delete process.env[key]
  }
}
// Allow keeping API keys (OpenRouter/RapidAPI) in .env.local while running against prod Supabase via ENV_FILE=.env.prod.
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import util from 'node:util'
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
  fullRefresh: boolean
  force: boolean
  refreshImages: boolean
  forceImages: boolean
  minImages: number
  imageDelayMs: number
  minPrice: number
  maxRuns: number
  pauseMs: number
  stopAfterNoSuccessRuns: number
  logFile: string
  cursor: boolean
  resetCursor: boolean
  cursorFile: string
}

function parseArgs(argv: string[]): Args {
  const defaults: Args = {
    limit: 200,
    batchSize: 10,
    delayMs: 1500,
    fullRefresh: false,
    force: false,
    refreshImages: false,
    forceImages: false,
    minImages: 10,
    imageDelayMs: 600,
    minPrice: 100000,
    maxRuns: 9999,
    pauseMs: 0,
    stopAfterNoSuccessRuns: 3,
    logFile: path.join('.logs', 'backfill-vibes-resume.log'),
    cursor: false,
    resetCursor: false,
    cursorFile: path.join('.logs', 'backfill-vibes-resume-state.json'),
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
  const fullRefresh = raw.fullRefresh === 'true' || defaults.fullRefresh
  let force = raw.force === 'true' || defaults.force
  let refreshImages =
    raw.refreshImages != null
      ? raw.refreshImages === 'true'
      : defaults.refreshImages
  let forceImages =
    raw.forceImages != null ? raw.forceImages === 'true' : defaults.forceImages
  let minImages = raw.minImages ? Number(raw.minImages) : defaults.minImages
  const imageDelayMs = raw.imageDelayMs
    ? Number(raw.imageDelayMs)
    : defaults.imageDelayMs
  const minPrice = raw.minPrice ? Number(raw.minPrice) : defaults.minPrice
  const maxRuns = raw.maxRuns ? Number(raw.maxRuns) : defaults.maxRuns
  const pauseMs = raw.pauseMs ? Number(raw.pauseMs) : defaults.pauseMs
  const stopAfterNoSuccessRuns = raw.stopAfterNoSuccessRuns
    ? Number(raw.stopAfterNoSuccessRuns)
    : defaults.stopAfterNoSuccessRuns
  const logFile = raw.logFile?.trim() || defaults.logFile
  const cursorFile = raw.cursorFile?.trim() || defaults.cursorFile
  const resetCursor = raw.resetCursor === 'true' || defaults.resetCursor

  if (fullRefresh) {
    force = true
    refreshImages = true
    if (raw.minImages == null) minImages = 30
  }

  const cursor =
    raw.cursor != null
      ? raw.cursor === 'true'
      : fullRefresh || force || refreshImages || forceImages

  return {
    limit: limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? batchSize
        : defaults.batchSize,
    delayMs:
      Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : defaults.delayMs,
    fullRefresh,
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
    logFile,
    cursor,
    resetCursor,
    cursorFile,
  }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

function installFileLogger(logFilePath: string): {
  close: () => Promise<void>
} {
  const resolvedPath = path.isAbsolute(logFilePath)
    ? logFilePath
    : path.join(process.cwd(), logFilePath)
  const dir = path.dirname(resolvedPath)

  fsSync.mkdirSync(dir, { recursive: true })
  fsSync.appendFileSync(resolvedPath, '')

  const stream = fsSync.createWriteStream(resolvedPath, { flags: 'a' })

  const original = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
  }

  function write(level: 'log' | 'warn' | 'error' | 'info', args: unknown[]) {
    try {
      stream.write(
        `[${new Date().toISOString()}] [${level}] ${util.format(...args)}\n`
      )
    } catch {
      // Ignore file write issues; never break the script.
    }
  }

  console.log = (...args) => {
    original.log(...args)
    write('log', args)
  }
  console.warn = (...args) => {
    original.warn(...args)
    write('warn', args)
  }
  console.error = (...args) => {
    original.error(...args)
    write('error', args)
  }
  console.info = (...args) => {
    original.info(...args)
    write('info', args)
  }

  console.log(
    `[backfill-vibes-resume] Logging to ${path.relative(process.cwd(), resolvedPath)}`
  )

  async function close() {
    console.log = original.log
    console.warn = original.warn
    console.error = original.error
    console.info = original.info
    await new Promise<void>((resolve) => stream.end(() => resolve()))
  }

  return { close }
}

type OffsetCursorState = {
  version: 1
  mode: 'offset'
  offset: number
  envFile: string
  supabaseHost: string
  minPrice: number
  updatedAt: string
}

function resolvePath(filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath)
}

async function readOffsetCursorState(
  cursorFilePath: string
): Promise<OffsetCursorState | null> {
  try {
    const raw = await fs.readFile(cursorFilePath, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { version?: unknown }).version === 1 &&
      (parsed as { mode?: unknown }).mode === 'offset'
    ) {
      const offset = Number((parsed as { offset?: unknown }).offset)
      const supabaseHost = String(
        (parsed as { supabaseHost?: unknown }).supabaseHost ?? ''
      )
      const minPrice = Number((parsed as { minPrice?: unknown }).minPrice)
      const envFile = String((parsed as { envFile?: unknown }).envFile ?? '')
      const updatedAt = String(
        (parsed as { updatedAt?: unknown }).updatedAt ?? ''
      )

      return {
        version: 1,
        mode: 'offset',
        offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
        envFile,
        supabaseHost,
        minPrice: Number.isFinite(minPrice) && minPrice >= 0 ? minPrice : 0,
        updatedAt,
      }
    }
  } catch {
    // Ignore missing/invalid cursor state.
  }

  return null
}

async function writeOffsetCursorState(
  cursorFilePath: string,
  state: Omit<OffsetCursorState, 'updatedAt'>
) {
  await fs.mkdir(path.dirname(cursorFilePath), { recursive: true })
  const payload: OffsetCursorState = {
    ...state,
    updatedAt: new Date().toISOString(),
  }
  await fs.writeFile(cursorFilePath, JSON.stringify(payload, null, 2))
}

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

  const fileLogger = installFileLogger(args.logFile)

  try {
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

    const cursorFilePath = resolvePath(args.cursorFile)
    let cursorOffset = 0

    if (args.cursor && args.limit != null) {
      const loaded = await readOffsetCursorState(cursorFilePath)
      const mismatch =
        loaded &&
        (loaded.supabaseHost !== supabaseHost || loaded.minPrice !== args.minPrice)

      if (args.resetCursor || mismatch) {
        cursorOffset = 0
        if (mismatch) {
          console.warn(
            `[backfill-vibes-resume] Cursor mismatch (stateHost=${loaded.supabaseHost || 'unknown'} stateMinPrice=${loaded.minPrice}); resetting offset to 0`
          )
        }
      } else if (loaded) {
        cursorOffset = loaded.offset
      }

      await writeOffsetCursorState(cursorFilePath, {
        version: 1,
        mode: 'offset',
        offset: cursorOffset,
        envFile,
        supabaseHost,
        minPrice: args.minPrice,
      })
      console.log(
        `[backfill-vibes-resume] Cursor enabled (offset=${cursorOffset}, file=${path.relative(process.cwd(), cursorFilePath)})`
      )
    } else if (args.cursor && args.limit == null) {
      console.warn(
        '[backfill-vibes-resume] --cursor=true ignored for --all=true (single run)'
      )
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
      const runOffset = args.cursor && args.limit != null ? cursorOffset : null
      console.log(
        `[backfill-vibes-resume] Run ${runs}/${args.maxRuns} (limit=${args.limit ?? 'all'}${runOffset != null ? `, offset=${runOffset}` : ''})`
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
          offset: runOffset ?? undefined,
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

      if (args.cursor && args.limit != null) {
        const prevOffset = cursorOffset
        cursorOffset = result.nextOffset ?? cursorOffset

        if (result.attempted > 0 && cursorOffset === prevOffset) {
          console.warn(
            `[backfill-vibes-resume] Cursor did not advance (offset=${cursorOffset}); stopping to avoid reprocessing the same page.`
          )
          break
        }

        await writeOffsetCursorState(cursorFilePath, {
          version: 1,
          mode: 'offset',
          offset: cursorOffset,
          envFile,
          supabaseHost,
          minPrice: args.minPrice,
        })
        console.log(`[backfill-vibes-resume] Cursor advanced to offset=${cursorOffset}`)
      }

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
          fullRefresh: args.fullRefresh,
          force: args.force,
          refreshImages: args.refreshImages,
          forceImages: args.forceImages,
          minImages: args.minImages,
          imageDelayMs: args.imageDelayMs,
          minPrice: args.minPrice,
          cursor: args.cursor,
          cursorFile: path.relative(process.cwd(), cursorFilePath),
          finalOffset: args.cursor && args.limit != null ? cursorOffset : null,
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
  } catch (err) {
    console.error('[backfill-vibes-resume] Fatal error:', err)
    process.exitCode = 1
  } finally {
    await fileLogger.close()
  }
}

void main()
