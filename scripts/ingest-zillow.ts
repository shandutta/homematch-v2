#!/usr/bin/env tsx

/**
 * Zillow ingestion script (RapidAPI)
 *
 * Usage examples:
 *   pnpm exec tsx scripts/ingest-zillow.ts --locations="San Francisco, CA;Oakland, CA" --pageSize=25 --maxPages=2
 *   pnpm exec tsx scripts/ingest-zillow.ts --location="San Francisco, CA" --maxPages=1
 *   pnpm exec tsx scripts/ingest-zillow.ts --sort=Price_Low_High --maxPages=5
 */

import { config } from 'dotenv'

const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile })
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import { ingestZillowLocations, ZillowSortOption } from '@/lib/ingestion/zillow'
import { createClient } from '@/lib/supabase/standalone'

type Args = {
  locations: string[]
  pageSize: number
  maxPages: number
  debug: boolean
  sort: ZillowSortOption
}

const VALID_SORT_OPTIONS: ZillowSortOption[] = [
  'Newest',
  'Price_High_Low',
  'Price_Low_High',
  'Beds',
  'Baths',
  'Square_Feet',
]

const isZillowSortOption = (value: string): value is ZillowSortOption =>
  VALID_SORT_OPTIONS.some((option) => option === value)

const DEFAULT_BAY_AREA_LOCATIONS = [
  'San Francisco, CA',
  'Alameda, CA',
  'Albany, CA',
  'American Canyon, CA',
  'Belmont, CA',
  'Benicia, CA',
  'Berkeley, CA',
  'Burlingame, CA',
  'Campbell, CA',
  'Concord, CA',
  'Cotati, CA',
  'Cupertino, CA',
  'Daly City, CA',
  'Danville, CA',
  'Dublin, CA',
  'El Cerrito, CA',
  'Emeryville, CA',
  'Fairfield, CA',
  'Foster City, CA',
  'Fremont, CA',
  'Gilroy, CA',
  'Half Moon Bay, CA',
  'Hayward, CA',
  'Healdsburg, CA',
  'Hercules, CA',
  'Lafayette, CA',
  'Livermore, CA',
  'Los Altos, CA',
  'Los Altos Hills, CA',
  'Los Gatos, CA',
  'Martinez, CA',
  'Menlo Park, CA',
  'Mill Valley, CA',
  'Millbrae, CA',
  'Milpitas, CA',
  'Morgan Hill, CA',
  'Mountain View, CA',
  'Napa, CA',
  'Newark, CA',
  'Novato, CA',
  'Oakland, CA',
  'Orinda, CA',
  'Pacifica, CA',
  'Palo Alto, CA',
  'Petaluma, CA',
  'Piedmont, CA',
  'Pinole, CA',
  'Pleasant Hill, CA',
  'Pleasanton, CA',
  'Redwood City, CA',
  'Richmond, CA',
  'Rohnert Park, CA',
  'San Bruno, CA',
  'San Carlos, CA',
  'San Jose, CA',
  'San Leandro, CA',
  'San Mateo, CA',
  'San Pablo, CA',
  'San Rafael, CA',
  'San Ramon, CA',
  'Saratoga, CA',
  'Santa Clara, CA',
  'Santa Rosa, CA',
  'Sausalito, CA',
  'Sebastopol, CA',
  'Sonoma, CA',
  'South San Francisco, CA',
  'Sunnyvale, CA',
  'Suisun City, CA',
  'Tiburon, CA',
  'Union City, CA',
  'Vacaville, CA',
  'Vallejo, CA',
  'Walnut Creek, CA',
]

function parseArgs(argv: string[]): Args {
  const defaults: Args = {
    locations: DEFAULT_BAY_AREA_LOCATIONS,
    pageSize: 50,
    maxPages: 10,
    debug: false,
    sort: 'Newest',
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
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
    : defaults.locations

  const pageSize = args.pageSize ? Number(args.pageSize) : defaults.pageSize
  const maxPages = args.maxPages ? Number(args.maxPages) : defaults.maxPages
  const debug = Boolean(
    args.debug && ['1', 'true', 'yes'].includes(args.debug.toLowerCase())
  )
  const sortRaw = args.sort || process.env.ZILLOW_SORT
  const sort = sortRaw && isZillowSortOption(sortRaw) ? sortRaw : defaults.sort

  if (sortRaw && sortRaw !== sort) {
    console.warn(
      `[ingest-zillow] Unknown sort "${sortRaw}". Falling back to "${sort}".`
    )
  }

  return {
    locations,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0 ? pageSize : defaults.pageSize,
    maxPages:
      Number.isFinite(maxPages) && maxPages > 0 ? maxPages : defaults.maxPages,
    debug,
    sort,
  }
}

async function main() {
  const { locations, pageSize, maxPages, debug, sort } = parseArgs(process.argv)

  const rapidApiKey = process.env.RAPIDAPI_KEY
  const rapidApiHost =
    process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'

  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY not set; update .env.local with a valid key.')
  }

  const supabase = createClient()

  console.log(
    `[ingest-zillow] Starting ingestion for ${locations.join(', ')} (pageSize=${pageSize}, maxPages=${maxPages}, sort=${sort})`
  )

  const summary = await ingestZillowLocations({
    locations,
    rapidApiKey,
    supabase,
    host: rapidApiHost,
    pageSize,
    maxPages,
    debug,
    sort,
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
