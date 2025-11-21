#!/usr/bin/env tsx

/**
 * Zillow ingestion script (RapidAPI)
 *
 * Usage examples:
 *   pnpm exec tsx scripts/ingest-zillow.ts --locations="San Francisco, CA;Oakland, CA" --pageSize=25 --maxPages=2
 *   pnpm exec tsx scripts/ingest-zillow.ts --location="San Francisco, CA" --maxPages=1
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { ingestZillowLocations } from '@/lib/ingestion/zillow'
import { createClient } from '@/lib/supabase/standalone'

type Args = {
  locations: string[]
  pageSize: number
  maxPages: number
}

function parseArgs(argv: string[]): Args {
  const defaults: Args = {
    locations: ['San Francisco, CA'],
    pageSize: 20,
    maxPages: 2,
  }

  const args: Record<string, string> = {}
  argv.slice(2).forEach((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=')
    if (k && v) {
      args[k] = v
    }
  })

  const locationsRaw =
    args.locations || args.location || process.env.ZILLOW_LOCATIONS

  const locations = locationsRaw
    ? locationsRaw
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : defaults.locations

  const pageSize = args.pageSize ? Number(args.pageSize) : defaults.pageSize
  const maxPages = args.maxPages ? Number(args.maxPages) : defaults.maxPages

  return {
    locations,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0 ? pageSize : defaults.pageSize,
    maxPages:
      Number.isFinite(maxPages) && maxPages > 0 ? maxPages : defaults.maxPages,
  }
}

async function main() {
  const { locations, pageSize, maxPages } = parseArgs(process.argv)

  const rapidApiKey = process.env.RAPIDAPI_KEY
  const rapidApiHost = process.env.RAPIDAPI_HOST || 'zillow-com1.p.rapidapi.com'

  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY not set; update .env.local with a valid key.')
  }

  const supabase = createClient()

  console.log(
    `[ingest-zillow] Starting ingestion for ${locations.join(', ')} (pageSize=${pageSize}, maxPages=${maxPages})`
  )

  const summary = await ingestZillowLocations({
    locations,
    rapidApiKey,
    supabase,
    host: rapidApiHost,
    pageSize,
    maxPages,
  })

  console.log('[ingest-zillow] Finished.')
  console.log(
    `[ingest-zillow] Totals: attempted=${summary.totals.attempted}, transformed=${summary.totals.transformed}, upserted=${summary.totals.insertedOrUpdated}, skipped=${summary.totals.skipped}`
  )

  summary.locations.forEach((loc) => {
    console.log(
      `[ingest-zillow] ${loc.location}: attempted=${loc.attempted}, transformed=${loc.transformed}, upserted=${loc.insertedOrUpdated}, skipped=${loc.skipped}`
    )
    if (loc.errors.length > 0) {
      console.log(
        `[ingest-zillow] ${loc.location} errors (showing up to 3): ${loc.errors.slice(0, 3).join(' | ')}`
      )
    }
  })
}

main().catch((err) => {
  console.error('[ingest-zillow] Fatal error:', err)
  process.exit(1)
})
