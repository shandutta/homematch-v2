#!/usr/bin/env tsx
/**
 * Bake-off backfill runner for property-vibes.
 *
 * Orchestrates POST /api/admin/generate-vibes-zillow over an explicit
 * list of zpids using a single model + image cap. Each call re-ingests
 * the property from Zillow first (the route's existing behavior) so
 * description + amenities are populated before the LLM sees the row.
 *
 * Scope is deliberately narrow: this script does NOT query Supabase,
 * select samples, or sweep diversity strategies. It takes a zpid list
 * (or reads one from --zpidsFile) and orchestrates HTTP calls + writes
 * a JSON report. Sample selection lives in SQL fed to it via --zpids
 * or --zpidsFile.
 *
 * Usage:
 *   pnpm exec tsx scripts/backfill-vibes.ts \
 *     --zpids=12345,67890 \
 *     --model=qwen/qwen3.6-plus \
 *     [--imageCap=40] \
 *     [--prodUrl=https://homematch.pro] \
 *     [--cronSecret=...] \
 *     [--reportPath=.logs/backfill-vibes-{timestamp}.json] \
 *     [--zpidsFile=path/to/list.txt]   # newline- or comma-separated
 *
 * Required env (when not passed via CLI):
 *   VIBES_CRON_SECRET   used as x-cron-secret header
 *
 * Behavior:
 *   - One POST per zpid with { zpid, force: true, model, imageCap }.
 *     The route accepts `zpid` or `zillowUrl` in body; we use `zpid`
 *     (numeric-friendly). `force` is forwarded for forward-compat with
 *     any caching layer the route may grow.
 *   - Failures per zpid are recorded and execution continues.
 *   - Hard 5 minute overall timeout (configurable via --timeoutMs).
 *   - Final report (JSON) written to --reportPath.
 *   - Compact per-zpid stdout line: zpid -> ok + tagline preview, or
 *     zpid -> FAIL + error preview.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { promises as fs } from 'node:fs'
import path from 'node:path'

interface Args {
  zpids: string[]
  model: string
  imageCap: number
  prodUrl: string
  cronSecret: string
  reportPath: string
  timeoutMs: number
}

interface ZpidResult {
  zpid: string
  success: boolean
  status: number | null
  latencyMs: number
  // Reported by the route's response body. When success=false these are
  // undefined; the `error` field carries the failure reason instead.
  costUsd?: number
  tagline?: string
  vibeStatement?: string
  suggestedTags?: string[]
  modelUsed?: string
  imagesAnalyzedCount?: number
  error?: string
}

interface Report {
  generatedAt: string
  args: {
    model: string
    imageCap: number
    prodUrl: string
    zpidCount: number
    reportPath: string
    timeoutMs: number
  }
  results: ZpidResult[]
  summary: {
    total: number
    success: number
    failed: number
    totalCostUsd: number
    totalLatencyMs: number
    avgLatencyMs: number
  }
  abortedDueToTimeout: boolean
}

function parseArgs(argv: string[]): Args {
  const raw: Record<string, string> = {}
  argv.slice(2).forEach((arg) => {
    const eq = arg.indexOf('=')
    if (arg.startsWith('--') && eq > 0) {
      raw[arg.slice(2, eq)] = arg.slice(eq + 1)
    }
  })

  const ts = new Date().toISOString().replace(/[:.]/g, '-')

  const model = raw.model
  if (!model || !model.trim()) {
    console.error('error: --model is required')
    process.exit(2)
  }

  const imageCapRaw = raw.imageCap ? Number(raw.imageCap) : 40
  if (
    !Number.isFinite(imageCapRaw) ||
    !Number.isInteger(imageCapRaw) ||
    imageCapRaw < 1 ||
    imageCapRaw > 60
  ) {
    console.error('error: --imageCap must be an integer between 1 and 60')
    process.exit(2)
  }

  const prodUrl = (raw.prodUrl || 'https://homematch.pro').replace(/\/$/, '')

  const cronSecret = raw.cronSecret || process.env.VIBES_CRON_SECRET || ''
  if (!cronSecret) {
    console.error(
      'error: --cronSecret missing and VIBES_CRON_SECRET not set in env'
    )
    process.exit(2)
  }

  const reportPath =
    raw.reportPath ||
    path.join(
      '.logs',
      `backfill-vibes-${ts}-${model.replace(/[/:]/g, '_')}.json`
    )

  const timeoutMs = raw.timeoutMs ? Number(raw.timeoutMs) : 5 * 60 * 1000
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    console.error('error: --timeoutMs must be a positive number')
    process.exit(2)
  }

  return {
    zpids: [], // resolved below in resolveZpids()
    model: model.trim(),
    imageCap: imageCapRaw,
    prodUrl,
    cronSecret,
    reportPath,
    timeoutMs,
  }
}

async function resolveZpids(argv: string[]): Promise<string[]> {
  const raw: Record<string, string> = {}
  argv.slice(2).forEach((arg) => {
    const eq = arg.indexOf('=')
    if (arg.startsWith('--') && eq > 0) {
      raw[arg.slice(2, eq)] = arg.slice(eq + 1)
    }
  })

  const list: string[] = []
  if (raw.zpids) {
    for (const tok of raw.zpids.split(',')) {
      const trimmed = tok.trim()
      if (trimmed) list.push(trimmed)
    }
  }
  if (raw.zpidsFile) {
    const text = await fs.readFile(raw.zpidsFile, 'utf8')
    for (const tok of text.split(/[\s,]+/)) {
      const trimmed = tok.trim()
      if (trimmed) list.push(trimmed)
    }
  }

  // Dedupe while preserving order.
  const seen = new Set<string>()
  const unique: string[] = []
  for (const z of list) {
    if (!seen.has(z)) {
      seen.add(z)
      unique.push(z)
    }
  }

  if (unique.length === 0) {
    console.error(
      'error: provide --zpids=1,2,3 and/or --zpidsFile=path with at least one zpid'
    )
    process.exit(2)
  }
  return unique
}

interface RouteResponseBody {
  ok?: boolean
  vibes?: {
    tagline?: string
    vibeStatement?: string
    suggestedTags?: string[]
  }
  imagesAnalyzed?: Array<{ url?: string; category?: string }>
  usage?: { estimatedCostUsd?: number }
  modelUsed?: string
  // Route may report errors via { ok: false, error } or a top-level error
  // shape. Treat both as failure signals.
  error?: string
  message?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickResponseShape(value: unknown): RouteResponseBody {
  if (!isRecord(value)) return {}
  const out: RouteResponseBody = {}
  if (typeof value.ok === 'boolean') out.ok = value.ok
  if (isRecord(value.vibes)) {
    const v = value.vibes
    const vibes: NonNullable<RouteResponseBody['vibes']> = {}
    if (typeof v.tagline === 'string') vibes.tagline = v.tagline
    if (typeof v.vibeStatement === 'string')
      vibes.vibeStatement = v.vibeStatement
    if (Array.isArray(v.suggestedTags)) {
      vibes.suggestedTags = v.suggestedTags.filter(
        (t): t is string => typeof t === 'string'
      )
    }
    out.vibes = vibes
  }
  if (Array.isArray(value.imagesAnalyzed)) {
    out.imagesAnalyzed = value.imagesAnalyzed.filter(
      (it): it is { url?: string; category?: string } => isRecord(it)
    )
  }
  if (isRecord(value.usage)) {
    const u = value.usage
    const usage: NonNullable<RouteResponseBody['usage']> = {}
    if (typeof u.estimatedCostUsd === 'number') {
      usage.estimatedCostUsd = u.estimatedCostUsd
    }
    out.usage = usage
  }
  if (typeof value.modelUsed === 'string') out.modelUsed = value.modelUsed
  if (typeof value.error === 'string') out.error = value.error
  if (typeof value.message === 'string') out.message = value.message
  return out
}

async function postOne(args: Args, zpid: string): Promise<ZpidResult> {
  const url = `${args.prodUrl}/api/admin/generate-vibes-zillow`
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-cron-secret': args.cronSecret,
      },
      body: JSON.stringify({
        // The route accepts `zpid` (or `zillowUrl`) in the request body.
        // The task spec named this `zpidOrUrl`; we map to the actual
        // field the route reads. `force: true` is forwarded for
        // forward-compat with any caching layer the route may grow.
        zpid,
        force: true,
        model: args.model,
        imageCap: args.imageCap,
      }),
    })

    const latencyMs = Date.now() - startedAt
    const text = await response.text()
    let parsed: unknown
    try {
      parsed = text ? JSON.parse(text) : {}
    } catch {
      parsed = { error: `non-JSON response: ${text.slice(0, 200)}` }
    }
    const body = pickResponseShape(parsed)

    if (!response.ok || body.ok === false) {
      return {
        zpid,
        success: false,
        status: response.status,
        latencyMs,
        error:
          body.error ||
          body.message ||
          `HTTP ${response.status} ${response.statusText}`,
      }
    }

    return {
      zpid,
      success: true,
      status: response.status,
      latencyMs,
      costUsd: body.usage?.estimatedCostUsd,
      tagline: body.vibes?.tagline,
      vibeStatement: body.vibes?.vibeStatement,
      suggestedTags: body.vibes?.suggestedTags,
      modelUsed: body.modelUsed,
      imagesAnalyzedCount: body.imagesAnalyzed?.length,
    }
  } catch (err) {
    return {
      zpid,
      success: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function truncate(value: string | undefined, max: number): string {
  if (!value) return ''
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)
  args.zpids = await resolveZpids(process.argv)

  console.log(
    `[backfill-vibes] model=${args.model} imageCap=${args.imageCap} ` +
      `prodUrl=${args.prodUrl} zpids=${args.zpids.length} ` +
      `timeoutMs=${args.timeoutMs}`
  )

  const startedAt = Date.now()
  const deadline = startedAt + args.timeoutMs
  const results: ZpidResult[] = []
  let abortedDueToTimeout = false

  for (const zpid of args.zpids) {
    if (Date.now() >= deadline) {
      abortedDueToTimeout = true
      console.warn(
        `[backfill-vibes] aborting before zpid=${zpid}: ` +
          `${args.timeoutMs}ms timeout reached`
      )
      break
    }
    const result = await postOne(args, zpid)
    results.push(result)
    if (result.success) {
      console.log(
        `[backfill-vibes] ${zpid} -> ok ${result.latencyMs}ms ` +
          `cost=$${(result.costUsd ?? 0).toFixed(4)} ` +
          `tagline=${JSON.stringify(truncate(result.tagline, 80))}`
      )
    } else {
      console.log(
        `[backfill-vibes] ${zpid} -> FAIL ${result.latencyMs}ms ` +
          `status=${result.status ?? 'none'} ` +
          `error=${JSON.stringify(truncate(result.error, 200))}`
      )
    }
  }

  const totalLatencyMs = results.reduce((sum, r) => sum + r.latencyMs, 0)
  const totalCostUsd = results.reduce((sum, r) => sum + (r.costUsd ?? 0), 0)
  const successCount = results.filter((r) => r.success).length

  const report: Report = {
    generatedAt: new Date().toISOString(),
    args: {
      model: args.model,
      imageCap: args.imageCap,
      prodUrl: args.prodUrl,
      zpidCount: args.zpids.length,
      reportPath: args.reportPath,
      timeoutMs: args.timeoutMs,
    },
    results,
    summary: {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
      totalCostUsd,
      totalLatencyMs,
      avgLatencyMs: results.length > 0 ? totalLatencyMs / results.length : 0,
    },
    abortedDueToTimeout,
  }

  await fs.mkdir(path.dirname(args.reportPath), { recursive: true })
  await fs.writeFile(args.reportPath, JSON.stringify(report, null, 2), 'utf8')

  console.log(
    `[backfill-vibes] done. ${successCount}/${results.length} ok, ` +
      `$${totalCostUsd.toFixed(4)} total, report=${args.reportPath}` +
      (abortedDueToTimeout ? ' [TIMEOUT]' : '')
  )
}

main().catch((err) => {
  console.error('[backfill-vibes] fatal:', err)
  process.exit(1)
})
