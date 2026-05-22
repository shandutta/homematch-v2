#!/usr/bin/env tsx

/**
 * Discover current Bay Area FOR-SALE listings via RapidAPI
 * propertyExtendedSearch and UPSERT thin rows into `properties` (keyed on
 * zpid). These rows are intentionally thin (one thumbnail, no
 * description/amenities) — enrich them afterwards with the full /property +
 * /images + vibes pipeline:
 *
 *   HOMEMATCH_ALLOW_PAID_RAPIDAPI=true ENV_FILE=.env.prod \
 *     pnpm exec tsx scripts/discover-properties.ts --maxPages=5
 *
 *   # then enrich (metadata + galleries + vibes):
 *   ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-vibes-resume.ts \
 *     --limit=200 --fullRefresh=true
 *
 * Options:
 *   --maxPages=5        Pages per location (default 5)
 *   --pageSize=40       Results per page (default 40)
 *   --homeTypes=...     Comma list of Houses,Townhomes,Condos,MultiFamily (default all)
 *   --sort=Newest       Newest | Price_Low_High | Price_High_Low | Homes_For_You
 *   --delayMs=1100      Pacing between RapidAPI calls (default 1100 ≈ <1/sec, safe under PRO's 2/sec)
 *   --maxRequests=400   Hard cap on RapidAPI calls per home-type run (default 400)
 *   --dryRun=true       Fetch + count only; no DB writes
 */

import { config } from 'dotenv'
const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile, override: true })
for (const key of ['RAPIDAPI_KEY']) {
  if (process.env[key] != null && process.env[key].trim() === '') {
    delete process.env[key]
  }
}
// Allow keeping the RapidAPI key in .env.local while running against prod
// Supabase via ENV_FILE=.env.prod.
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import fs from 'node:fs/promises'
import path from 'node:path'
import { runDiscover } from '@/lib/ingestion/discover'
import { createStandaloneClient } from '@/lib/supabase/standalone'

type HomeType = 'Houses' | 'Townhomes' | 'Condos' | 'MultiFamily'
const ALL_HOME_TYPES: HomeType[] = [
  'Houses',
  'Condos',
  'Townhomes',
  'MultiFamily',
]
const HOME_TYPE_SET = new Set<string>(ALL_HOME_TYPES)

type Sort = 'Newest' | 'Price_Low_High' | 'Price_High_Low' | 'Homes_For_You'

function safeHost(url?: string | null): string {
  if (!url) return ''
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

function parseArgs(argv: string[]) {
  const raw: Record<string, string> = {}
  argv.slice(2).forEach((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=')
    if (k && v != null) raw[k] = v
  })

  const homeTypes = (
    raw.homeTypes
      ? raw.homeTypes
          .split(',')
          .map((s) => s.trim())
          .filter((s) => HOME_TYPE_SET.has(s))
      : ALL_HOME_TYPES
  ) as HomeType[]

  return {
    maxPages: raw.maxPages ? Number(raw.maxPages) : 5,
    pageSize: raw.pageSize ? Number(raw.pageSize) : 40,
    homeTypes: homeTypes.length > 0 ? homeTypes : ALL_HOME_TYPES,
    sort: (raw.sort as Sort) || 'Newest',
    delayMs: raw.delayMs ? Number(raw.delayMs) : 1100,
    maxRequests: raw.maxRequests ? Number(raw.maxRequests) : 400,
    dryRun: raw.dryRun === 'true',
  }
}

async function main() {
  const args = parseArgs(process.argv)

  if (!process.env.RAPIDAPI_KEY) {
    throw new Error(`RAPIDAPI_KEY not set; add to ${envFile} or .env.local`)
  }

  const supabaseHost = safeHost(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  )
  console.log(
    `[discover] Env ${envFile} (supabaseHost=${supabaseHost || 'unknown'}) dryRun=${args.dryRun}`
  )
  console.log(
    `[discover] homeTypes=${args.homeTypes.join(',')} maxPages=${args.maxPages} pageSize=${args.pageSize} sort=${args.sort} delayMs=${args.delayMs} maxRequests=${args.maxRequests}`
  )

  const totals = {
    pagesFetched: 0,
    resultsConsidered: 0,
    inAllowlist: 0,
    upserted: 0,
    skipped: 0,
    errors: 0,
    requestsIssued: 0,
  }

  for (const homeType of args.homeTypes) {
    console.log(`\n[discover] === homeType=${homeType} ===`)
    const summary = await runDiscover({
      homeType,
      maxPages: args.maxPages,
      pageSize: args.pageSize,
      sort: args.sort,
      dryRun: args.dryRun,
      clientOptions: {
        delayMs: args.delayMs,
        maxRequests: args.maxRequests,
      },
    })
    console.log(
      `[discover] ${homeType}: pages=${summary.pagesFetched} considered=${summary.resultsConsidered} inAllowlist=${summary.inAllowlist} upserted=${summary.upserted} skipped=${summary.skipped} errors=${summary.errors} rapidApiReq=${summary.rapidApi.requestsIssued}`
    )
    totals.pagesFetched += summary.pagesFetched
    totals.resultsConsidered += summary.resultsConsidered
    totals.inAllowlist += summary.inAllowlist
    totals.upserted += summary.upserted
    totals.skipped += summary.skipped
    totals.errors += summary.errors
    totals.requestsIssued += summary.rapidApi.requestsIssued
  }

  console.log(
    `\n[discover] TOTAL pages=${totals.pagesFetched} considered=${totals.resultsConsidered} inAllowlist=${totals.inAllowlist} upserted=${totals.upserted} skipped=${totals.skipped} errors=${totals.errors} rapidApiReq=${totals.requestsIssued}`
  )

  // Discovery writes coordinates (from Zillow lat/lng) but not neighborhood_id.
  // Assign neighborhoods via point-in-polygon (st_covers against the 1,264
  // neighborhood boundary polygons) so the app's neighborhood/city features
  // work on the fresh inventory. No-op for the rows that already have one.
  let neighborhoodsAssigned = 0
  if (!args.dryRun) {
    try {
      const supabase = createStandaloneClient()
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const rpc = supabase.rpc as unknown as (
        fn: string,
        params?: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message: string } | null }>
      const { data, error } = await rpc('backfill_property_neighborhoods', {})
      if (error) {
        console.warn(
          `[discover] neighborhood assignment failed: ${error.message}`
        )
      } else {
        neighborhoodsAssigned = typeof data === 'number' ? data : 0
        console.log(
          `[discover] neighborhood_id assigned to ${neighborhoodsAssigned} properties (point-in-polygon)`
        )
      }
    } catch (err) {
      console.warn(
        `[discover] neighborhood assignment error: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  try {
    const reportDir = path.join(process.cwd(), '.logs')
    await fs.mkdir(reportDir, { recursive: true })
    const finishedAt = new Date().toISOString()
    const report = {
      finishedAt,
      envFile,
      supabaseHost,
      args,
      totals,
      neighborhoodsAssigned,
    }
    await fs.writeFile(
      path.join(reportDir, 'discover-report.json'),
      JSON.stringify(report, null, 2)
    )
    console.log('[discover] Report: .logs/discover-report.json')
  } catch (err) {
    console.warn(
      `[discover] Failed to write report: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

void main().catch((err) => {
  console.error('[discover] Fatal:', err)
  process.exitCode = 1
})
