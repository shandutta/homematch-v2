#!/usr/bin/env tsx

/**
 * Compare Supabase active listings vs RapidAPI totals by city.
 * Goal: detect coverage gaps (db << rapid) or stale actives (db >> rapid).
 */

import { config } from 'dotenv'
const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile })
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'

type Args = {
  locations: string[]
  thresholdLow: number
  thresholdHigh: number
  delayMs: number
  includePending: boolean
  showAll: boolean
}

type CoverageRow = {
  location: string
  cityKey: string
  dbActive: number
  rapidTotal: number
  ratio: number | null
}

function parseArgs(argv: string[]): Args {
  const raw: Record<string, string> = {}
  argv.slice(2).forEach((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=')
    if (k && v != null) raw[k] = v
  })

  const locationsRaw =
    raw.locations || raw.location || process.env.ZILLOW_LOCATIONS || ''

  const locations = locationsRaw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  const thresholdLow = raw.thresholdLow ? Number(raw.thresholdLow) : 0.8
  const thresholdHigh = raw.thresholdHigh ? Number(raw.thresholdHigh) : 1.3
  const delayMs = raw.delayMs ? Number(raw.delayMs) : 350

  return {
    locations,
    thresholdLow: Number.isFinite(thresholdLow) ? thresholdLow : 0.8,
    thresholdHigh: Number.isFinite(thresholdHigh) ? thresholdHigh : 1.3,
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 350,
    includePending:
      raw.includePending != null ? raw.includePending === 'true' : true,
    showAll: raw.showAll === 'true',
  }
}

function normalizeCityKey(city: string): string {
  return city.trim().toUpperCase()
}

async function loadActiveCounts(includePending: boolean) {
  const supabase = createStandaloneClient()
  const counts = new Map<string, number>()
  const pageSize = 1000
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('properties')
      .select('city, listing_status, is_active')
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Supabase read failed: ${error.message}`)
    }
    if (!data || data.length === 0) break

    for (const row of data) {
      const city = typeof row.city === 'string' ? row.city : ''
      if (!city) continue
      const status =
        typeof row.listing_status === 'string' ? row.listing_status : ''
      const isActive =
        row.is_active === true ||
        status.toLowerCase() === 'active' ||
        (includePending && status.toLowerCase() === 'pending')

      if (!isActive) continue
      const key = normalizeCityKey(city)
      counts.set(key, (counts.get(key) || 0) + 1)
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  return counts
}

async function fetchRapidTotal(location: string): Promise<number> {
  const rapidKey = process.env.RAPIDAPI_KEY
  const rapidHost =
    process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'

  if (!rapidKey) {
    throw new Error('RAPIDAPI_KEY missing')
  }

  const params = new URLSearchParams({
    location,
    status_type: 'ForSale',
    page: '1',
    pageSize: '1',
  })
  const url = `https://${rapidHost}/propertyExtendedSearch?${params.toString()}`
  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': rapidKey,
      'X-RapidAPI-Host': rapidHost,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RapidAPI ${res.status}: ${text.slice(0, 160)}`)
  }
  const body = (await res.json()) as {
    totalResultCount?: number
    totalCount?: number
    total_count?: number
  }
  return Number(
    body.totalResultCount || body.totalCount || body.total_count || 0
  )
}

function formatRatio(ratio: number | null): string {
  if (ratio == null) return 'n/a'
  return ratio.toFixed(2)
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.locations.length === 0) {
    console.error(
      '[report-zillow-coverage] No locations provided. Set ZILLOW_LOCATIONS or pass --locations.'
    )
    process.exit(1)
  }

  const counts = await loadActiveCounts(args.includePending)
  const results: CoverageRow[] = []

  for (const location of args.locations) {
    const city = location.split(',')[0]?.trim() || location
    const cityKey = normalizeCityKey(city)
    const rapidTotal = await fetchRapidTotal(location)
    const dbActive = counts.get(cityKey) || 0
    const ratio = rapidTotal > 0 ? dbActive / rapidTotal : null
    results.push({ location, cityKey, dbActive, rapidTotal, ratio })
    await new Promise((r) => setTimeout(r, args.delayMs))
  }

  results.sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0))

  const totalDb = results.reduce((sum, row) => sum + row.dbActive, 0)
  const totalRapid = results.reduce((sum, row) => sum + row.rapidTotal, 0)
  const overallRatio =
    totalRapid > 0 ? Number((totalDb / totalRapid).toFixed(3)) : null

  const low = results.filter(
    (row) => row.ratio != null && row.ratio < args.thresholdLow
  )
  const high = results.filter(
    (row) => row.ratio != null && row.ratio > args.thresholdHigh
  )

  console.log(
    `[report-zillow-coverage] locations=${results.length} totalDb=${totalDb} totalRapid=${totalRapid} ratio=${overallRatio ?? 'n/a'}`
  )
  console.log(
    `[report-zillow-coverage] thresholds: low<${args.thresholdLow} high>${args.thresholdHigh} includePending=${args.includePending}`
  )

  if (args.showAll) {
    results.forEach((row) => {
      console.log(
        `${row.location}: db=${row.dbActive} rapid=${row.rapidTotal} ratio=${formatRatio(
          row.ratio
        )}`
      )
    })
  } else {
    const lowSample = low.slice(0, 10)
    const highSample = high.slice(-10)

    if (lowSample.length > 0) {
      console.log('\nLowest coverage:')
      lowSample.forEach((row) => {
        console.log(
          `${row.location}: db=${row.dbActive} rapid=${row.rapidTotal} ratio=${formatRatio(
            row.ratio
          )}`
        )
      })
    }

    if (highSample.length > 0) {
      console.log('\nHighest coverage:')
      highSample.forEach((row) => {
        console.log(
          `${row.location}: db=${row.dbActive} rapid=${row.rapidTotal} ratio=${formatRatio(
            row.ratio
          )}`
        )
      })
    }

    if (lowSample.length === 0 && highSample.length === 0) {
      console.log('\nCoverage looks balanced across all cities.')
    }
  }
}

main().catch((err) => {
  console.error(
    '[report-zillow-coverage] Fatal:',
    err instanceof Error ? err.message : err
  )
  process.exit(1)
})
