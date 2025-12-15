#!/usr/bin/env tsx

/**
 * Backfill neighborhood vibes for existing neighborhoods.
 *
 * Safe defaults for manual runs:
 *   pnpm exec tsx scripts/backfill-neighborhood-vibes.ts --limit=10
 *
 * Resumable runs (cursor file):
 *   pnpm exec tsx scripts/backfill-neighborhood-vibes.ts --all=true --resume=true
 *
 * Options:
 *   --limit=10        Max vibes to attempt (default 10; omit for all)
 *   --all=true        Process all neighborhoods (ignores limit)
 *   --batchSize=10    Page sizing multiplier (default 10)
 *   --delayMs=800     Delay between neighborhoods (default 800)
 *   --force=true      Regenerate even if a vibe record exists
 *   --offset=0        Start offset for ordered neighborhoods page scan (default 0)
 *   --resume=true     Load offset from --cursorFile (unless --offset is provided)
 *   --cursorFile=.logs/backfill-neighborhood-vibes-cursor.json
 *   --logFile=.logs/backfill-neighborhood-vibes.log
 *   --sampleLimit=12  Sample properties per neighborhood (default 12)
 *   --includeStats=false  Skip get_neighborhood_stats RPC (default true)
 *   --neighborhoodIds=uuid,uuid   Target specific neighborhoods (disables offset/cursor)
 *   --states=CA,NY       Only process neighborhoods in these states
 *   --state=CA           Alias for --states=CA
 */

import { config } from 'dotenv'
const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile, override: true })
for (const key of ['OPENROUTER_API_KEY']) {
  if (process.env[key] != null && process.env[key].trim() === '') {
    delete process.env[key]
  }
}
// Allow keeping API keys in .env.local while running against prod Supabase via ENV_FILE=.env.prod.
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import util from 'node:util'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import { createNeighborhoodVibesService } from '@/lib/services/neighborhood-vibes'
import {
  backfillNeighborhoodVibes,
  type BackfillNeighborhoodVibesCursor,
} from '@/lib/services/neighborhood-vibes/backfill'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
  neighborhoodIds: string[] | null
  states: string[] | null
  offset: number
  offsetProvided: boolean
  resume: boolean
  cursorFile: string
  logFile: string
  sampleLimit: number
  includeStats: boolean
}

function parseArgs(argv: string[]): Args {
  const defaults: Args = {
    limit: 10,
    batchSize: 10,
    delayMs: 800,
    force: false,
    neighborhoodIds: null,
    states: null,
    offset: 0,
    offsetProvided: false,
    resume: false,
    cursorFile: path.join('.logs', 'backfill-neighborhood-vibes-cursor.json'),
    logFile: path.join('.logs', 'backfill-neighborhood-vibes.log'),
    sampleLimit: 12,
    includeStats: true,
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
  const neighborhoodIds =
    raw.neighborhoodIds != null
      ? raw.neighborhoodIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : defaults.neighborhoodIds

  const statesRaw = (raw.states ?? raw.state)?.trim()
  const states =
    statesRaw != null && statesRaw.length > 0
      ? Array.from(
          new Set(
            statesRaw
              .split(',')
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          )
        )
      : defaults.states

  if (states) {
    const invalid = states.filter((s) => !/^[A-Z]{2}$/.test(s))
    if (invalid.length > 0) {
      throw new Error(
        `Invalid --states value(s): ${invalid.join(', ')} (expected state codes like CA)`
      )
    }
  }

  const offsetProvided = raw.offset != null
  const offset = offsetProvided ? Number(raw.offset) : defaults.offset

  const resume = raw.resume === 'true' || defaults.resume
  const cursorFile = raw.cursorFile?.trim() || defaults.cursorFile
  const logFile = raw.logFile?.trim() || defaults.logFile
  const sampleLimit = raw.sampleLimit
    ? Number(raw.sampleLimit)
    : defaults.sampleLimit
  const includeStats =
    raw.includeStats != null
      ? raw.includeStats !== 'false'
      : defaults.includeStats

  return {
    limit: limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? batchSize
        : defaults.batchSize,
    delayMs:
      Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : defaults.delayMs,
    force,
    neighborhoodIds:
      neighborhoodIds && neighborhoodIds.length > 0 ? neighborhoodIds : null,
    states: states && states.length > 0 ? states : null,
    offset:
      Number.isFinite(offset) && offset >= 0
        ? Math.floor(offset)
        : defaults.offset,
    offsetProvided,
    resume,
    cursorFile,
    logFile,
    sampleLimit:
      Number.isFinite(sampleLimit) && sampleLimit > 0
        ? Math.floor(sampleLimit)
        : defaults.sampleLimit,
    includeStats,
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
    `[backfill-neighborhood-vibes] Logging to ${path.relative(process.cwd(), resolvedPath)}`
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

function normalizeStatesFilter(states: unknown): string[] | null {
  if (!Array.isArray(states)) return null
  const normalized = Array.from(
    new Set(
      states
        .map((s) => (typeof s === 'string' ? s.trim().toUpperCase() : ''))
        .filter(Boolean)
    )
  )
  return normalized.length > 0 ? normalized : null
}

function areStateFiltersEqual(a: string[] | null, b: string[] | null): boolean {
  const aKey = (a ?? []).slice().sort().join(',')
  const bKey = (b ?? []).slice().sort().join(',')
  return aKey === bKey
}

async function readCursorOffset(
  cursorFile: string,
  expectedFilters: {
    states: string[] | null
  }
): Promise<{
  offset: number | null
  reason: 'ok' | 'missing' | 'invalid' | 'filters_mismatch'
  cursorStates: string[] | null
}> {
  const resolvedPath = path.isAbsolute(cursorFile)
    ? cursorFile
    : path.join(process.cwd(), cursorFile)
  try {
    const text = await fs.readFile(resolvedPath, 'utf8')
    const parsed = JSON.parse(text) as {
      offset?: unknown
      filters?: { states?: unknown }
    }
    const cursorStates = normalizeStatesFilter(parsed.filters?.states)

    if (!areStateFiltersEqual(cursorStates, expectedFilters.states)) {
      return {
        offset: null,
        reason: 'filters_mismatch',
        cursorStates,
      }
    }

    const offset = Number(parsed.offset)
    return Number.isFinite(offset) && offset >= 0
      ? { offset: Math.floor(offset), reason: 'ok', cursorStates }
      : { offset: null, reason: 'invalid', cursorStates }
  } catch {
    return { offset: null, reason: 'missing', cursorStates: null }
  }
}

async function writeCursorFile(
  cursorFile: string,
  cursor: BackfillNeighborhoodVibesCursor,
  extra: {
    envFile: string
    supabaseHost: string
    canceled: boolean
    filters: {
      states: string[] | null
    }
  }
): Promise<void> {
  const resolvedPath = path.isAbsolute(cursorFile)
    ? cursorFile
    : path.join(process.cwd(), cursorFile)
  const dir = path.dirname(resolvedPath)

  try {
    await fs.mkdir(dir, { recursive: true })
    const payload = {
      updatedAt: new Date().toISOString(),
      envFile: extra.envFile,
      supabaseHost: extra.supabaseHost,
      canceled: extra.canceled,
      filters: extra.filters,
      ...cursor,
    }

    const tmpPath = `${resolvedPath}.tmp`
    await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2))
    await fs.rename(tmpPath, resolvedPath)
  } catch (error) {
    console.warn(
      `[backfill-neighborhood-vibes] Failed to write cursor file: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

function writeCursorFileSync(
  cursorFile: string,
  cursor: BackfillNeighborhoodVibesCursor,
  extra: {
    envFile: string
    supabaseHost: string
    canceled: boolean
    filters: {
      states: string[] | null
    }
  }
): void {
  const resolvedPath = path.isAbsolute(cursorFile)
    ? cursorFile
    : path.join(process.cwd(), cursorFile)
  const dir = path.dirname(resolvedPath)

  try {
    fsSync.mkdirSync(dir, { recursive: true })
    const payload = {
      updatedAt: new Date().toISOString(),
      envFile: extra.envFile,
      supabaseHost: extra.supabaseHost,
      canceled: extra.canceled,
      filters: extra.filters,
      ...cursor,
    }

    const tmpPath = `${resolvedPath}.tmp`
    fsSync.writeFileSync(tmpPath, JSON.stringify(payload, null, 2))
    fsSync.renameSync(tmpPath, resolvedPath)
  } catch (error) {
    console.warn(
      `[backfill-neighborhood-vibes] Failed to write cursor file: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const fileLogger = installFileLogger(args.logFile)

  let shouldStop = false

  const supabaseHost = safeHost(process.env.SUPABASE_URL)

  let lastCursor: BackfillNeighborhoodVibesCursor | null = null

  const handleStopSignal = (signal: 'SIGINT' | 'SIGTERM') => {
    if (!shouldStop) {
      shouldStop = true
      console.warn(
        `[backfill-neighborhood-vibes] Received ${signal}. Will stop after current neighborhood and persist cursor. (press Ctrl+C again to force exit)`
      )

      if (lastCursor) {
        writeCursorFileSync(args.cursorFile, lastCursor, {
          envFile,
          supabaseHost,
          canceled: true,
          filters: {
            states: args.states,
          },
        })
      }

      return
    }

    // NOTE: `pnpm exec` may forward SIGTERM after SIGINT. Treat SIGINT as the
    // explicit "force exit" signal and ignore follow-up SIGTERM while stopping.
    if (signal !== 'SIGINT') {
      console.warn(
        `[backfill-neighborhood-vibes] Received ${signal} while stopping; ignoring.`
      )
      return
    }

    console.warn('[backfill-neighborhood-vibes] Forcing exit.')
    if (lastCursor) {
      writeCursorFileSync(args.cursorFile, lastCursor, {
        envFile,
        supabaseHost,
        canceled: true,
        filters: {
          states: args.states,
        },
      })
    }
    process.exit(130)
  }

  const sigintHandler = () => handleStopSignal('SIGINT')
  const sigtermHandler = () => handleStopSignal('SIGTERM')

  process.on('SIGINT', sigintHandler)
  process.on('SIGTERM', sigtermHandler)

  try {
    if (args.neighborhoodIds) {
      const invalid = args.neighborhoodIds.filter((id) => !UUID_RE.test(id))
      if (invalid.length > 0) {
        throw new Error(
          `Invalid --neighborhoodIds value(s): ${invalid.join(', ')} (expected UUIDs)`
        )
      }
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error(`OPENROUTER_API_KEY not set; add to ${envFile}`)
    }

    console.log(
      `[backfill-neighborhood-vibes] Env loaded from ${envFile} (supabaseHost=${supabaseHost || 'unknown'})`
    )

    let startOffset = args.offset
    if (!args.neighborhoodIds && args.resume && !args.offsetProvided) {
      const fromCursor = await readCursorOffset(args.cursorFile, {
        states: args.states,
      })
      if (fromCursor.reason === 'ok' && fromCursor.offset != null) {
        startOffset = fromCursor.offset
        console.log(
          `[backfill-neighborhood-vibes] Resuming from cursor offset=${startOffset} (${args.cursorFile})`
        )
      } else if (fromCursor.reason === 'filters_mismatch') {
        console.log(
          `[backfill-neighborhood-vibes] Resume requested but cursor filters mismatch (cursorStates=${fromCursor.cursorStates?.join(',') || 'all'} expectedStates=${args.states?.join(',') || 'all'}); starting offset=${startOffset}`
        )
      } else {
        console.log(
          `[backfill-neighborhood-vibes] Resume requested but no cursor found; starting offset=${startOffset}`
        )
      }
    }

    if (!args.neighborhoodIds) {
      lastCursor = {
        offset: startOffset,
        lastNeighborhoodId: null,
        attempted: 0,
        skipped: 0,
        success: 0,
        failed: 0,
        totalCostUsd: 0,
      }
    }

    const supabase = createStandaloneClient()
    const neighborhoodVibesService = createNeighborhoodVibesService()

    const result = await backfillNeighborhoodVibes(
      {
        limit: args.limit,
        batchSize: args.batchSize,
        delayMs: args.delayMs,
        force: args.force,
        neighborhoodIds: args.neighborhoodIds,
        states: args.states,
        offset: startOffset,
        sampleLimit: args.sampleLimit,
        includeStats: args.includeStats,
      },
      {
        supabase,
        neighborhoodVibesService,
        sleep,
        shouldStop: () => shouldStop,
        onCursor: async (cursor) => {
          lastCursor = cursor
          await writeCursorFile(args.cursorFile, cursor, {
            envFile,
            supabaseHost,
            canceled: false,
            filters: {
              states: args.states,
            },
          })
        },
      }
    )

    try {
      const reportDir = path.join(process.cwd(), '.logs')
      await fs.mkdir(reportDir, { recursive: true })

      const finishedAt = new Date().toISOString()
      const stamp = finishedAt.replace(/[:.]/g, '-')
      const report = {
        finishedAt,
        envFile,
        supabaseHost,
        args: {
          limit: args.limit,
          batchSize: args.batchSize,
          delayMs: args.delayMs,
          force: args.force,
          offset: args.neighborhoodIds ? null : startOffset,
          resume: args.resume,
          neighborhoodIdsCount: args.neighborhoodIds?.length ?? 0,
          states: args.states,
          sampleLimit: args.sampleLimit,
          includeStats: args.includeStats,
          cursorFile: args.neighborhoodIds ? null : args.cursorFile,
        },
        attempted: result.attempted,
        success: result.success,
        failed: result.failed,
        skipped: result.skipped,
        canceled: result.canceled,
        nextOffset: result.nextOffset,
        totalCostUsd: result.totalCostUsd,
        totalTimeMs: result.totalTimeMs,
        failures: result.failures,
      }

      const latestPath = path.join(
        reportDir,
        'backfill-neighborhood-vibes-report.json'
      )
      const datedPath = path.join(
        reportDir,
        `backfill-neighborhood-vibes-report-${stamp}.json`
      )
      await fs.writeFile(latestPath, JSON.stringify(report, null, 2))
      await fs.writeFile(datedPath, JSON.stringify(report, null, 2))

      console.log(
        `[backfill-neighborhood-vibes] Report written: ${path.relative(process.cwd(), latestPath)}`
      )
      console.log(
        `[backfill-neighborhood-vibes] Report archived: ${path.relative(process.cwd(), datedPath)}`
      )
    } catch (error) {
      console.warn(
        `[backfill-neighborhood-vibes] Failed to write report: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    if (!args.neighborhoodIds && lastCursor) {
      await writeCursorFile(args.cursorFile, lastCursor, {
        envFile,
        supabaseHost,
        canceled: result.canceled,
        filters: {
          states: args.states,
        },
      })
    }
  } catch (error) {
    console.error('[backfill-neighborhood-vibes] Fatal error:', error)
    process.exitCode = 1
  } finally {
    await fileLogger.close()
    process.off('SIGINT', sigintHandler)
    process.off('SIGTERM', sigtermHandler)
  }
}

void main()
