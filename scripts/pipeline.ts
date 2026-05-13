#!/usr/bin/env tsx
/**
 * Unified ingest pipeline CLI (I4 rebuild, 2026-05-13).
 *
 * Replaces the old `pnpm pipeline:*` family of npm scripts that pointed
 * at this file. The standalone scripts (refresh-zillow-status, fetch-zillow-images,
 * report-zillow-coverage, cleanup-properties-bayarea) keep working
 * unchanged — this CLI dispatches to them rather than reimplementing.
 *
 * Subcommands:
 *   discover     Stage 1: fetch + upsert listings (NEW MODULE)
 *   verify       Stage 3: status refresh + price update (existing script)
 *   enrich-images <zpid>  Image enrichment for one property (existing script)
 *   coverage     Coverage gap report DB vs RapidAPI (existing script)
 *   cleanup      Hard-delete properties outside the Bay Area allowlist (existing script)
 *   dry-run      Discover with --dryRun (no writes; reports cost shape)
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { spawn } from 'node:child_process'
import path from 'node:path'

const SCRIPTS_DIR = path.join(process.cwd(), 'scripts')

const usage = () => {
  console.log(`Usage: pnpm exec tsx scripts/pipeline.ts <subcommand> [args]

Subcommands:
  discover [--locations="A;B"] [--sort=Newest|Price_Low_High|...] [--maxPages=5] [--pageSize=40] [--homeType=Houses|...]
  verify [--limit=600] [--delayMs=350] [--activeOnly]
  enrich-images --zpid=12345678
  coverage [--locations="A;B"] [--showAll]
  cleanup
  dry-run [--locations="..."] [--maxPages=5]

Env:
  RAPIDAPI_KEY                       required for discover/verify/enrich-images
  HOMEMATCH_ALLOW_PAID_RAPIDAPI=1    required for any paid call (gate)
  HOMEMATCH_DISCOVER_MAX_REQUESTS    cap per discover run (default 1000)
  STATUS_REFRESH_MAX_ITEMS           verify limit (default 600)
  STATUS_DETAIL_DELAY_MS             pacing in ms (default 350)
`)
}

type ParsedArgs = Record<string, string | true>

const parseArgs = (argv: string[]): ParsedArgs => {
  const out: ParsedArgs = {}
  for (const a of argv) {
    if (!a.startsWith('--')) continue
    const eq = a.indexOf('=')
    if (eq === -1) {
      out[a.slice(2)] = true
    } else {
      out[a.slice(2, eq)] = a.slice(eq + 1)
    }
  }
  return out
}

const runScript = (file: string, extraArgs: string[] = []): Promise<number> =>
  new Promise((resolve) => {
    const child = spawn(
      'pnpm',
      ['exec', 'tsx', path.join(SCRIPTS_DIR, file), ...extraArgs],
      { stdio: 'inherit', env: process.env }
    )
    child.on('exit', (code) => resolve(code ?? 1))
  })

async function discoverSubcommand(args: ParsedArgs, dryRun: boolean) {
  const { runDiscover } = await import('@/lib/ingestion/discover')
  const locationsArg = args.locations
  const locations =
    typeof locationsArg === 'string' && locationsArg.length > 0
      ? locationsArg
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined

  const summary = await runDiscover({
    locations,
    sort: typeof args.sort === 'string' ? (args.sort as 'Newest') : undefined,
    maxPages:
      typeof args.maxPages === 'string'
        ? Number.parseInt(args.maxPages, 10)
        : undefined,
    pageSize:
      typeof args.pageSize === 'string'
        ? Number.parseInt(args.pageSize, 10)
        : undefined,
    homeType:
      typeof args.homeType === 'string'
        ? (args.homeType as 'Houses')
        : undefined,
    dryRun,
  })

  console.log(JSON.stringify(summary, null, 2))
}

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2)
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    usage()
    process.exit(subcommand ? 0 : 1)
  }

  const args = parseArgs(rest)

  switch (subcommand) {
    case 'discover':
      await discoverSubcommand(args, false)
      break
    case 'dry-run':
      await discoverSubcommand(args, true)
      break
    case 'verify':
      process.exit(await runScript('refresh-zillow-status.ts', rest))
      break
    case 'enrich-images':
      process.exit(await runScript('fetch-zillow-images.ts', rest))
      break
    case 'coverage':
      process.exit(await runScript('report-zillow-coverage.ts', rest))
      break
    case 'cleanup':
      process.exit(await runScript('cleanup-properties-bayarea.ts', rest))
      break
    default:
      console.error(`Unknown subcommand: ${subcommand}`)
      usage()
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('[pipeline]', err)
  process.exit(1)
})
