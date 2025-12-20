#!/usr/bin/env tsx

/**
 * Backfill properties.coordinates using Google Geocoding API.
 *
 * Usage examples:
 *   ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-property-coordinates.ts --batchSize=25
 *   pnpm exec tsx scripts/backfill-property-coordinates.ts --batchSize=10 --maxBatches=2
 */

import { config } from 'dotenv'
const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile, override: true })
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'
import { isValidLatLng } from '@/lib/utils/coordinates'

type Args = {
  batchSize: number
  maxBatches: number | null
  delayMs: number
  maxRetries: number
  fallbackOnDenied: boolean
  useCityCentroidFallback: boolean
}

function parseArgs(argv: string[]): Args {
  const defaults: Args = {
    batchSize: 25,
    maxBatches: null,
    delayMs: 300,
    maxRetries: 3,
    fallbackOnDenied: true,
    useCityCentroidFallback: false,
  }

  const raw: Record<string, string> = {}
  argv.slice(2).forEach((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=')
    if (k && v != null) raw[k] = v
  })

  const batchSize = raw.batchSize ? Number(raw.batchSize) : defaults.batchSize
  const maxBatches =
    raw.maxBatches != null ? Number(raw.maxBatches) : defaults.maxBatches
  const delayMs = raw.delayMs ? Number(raw.delayMs) : defaults.delayMs
  const maxRetries = raw.maxRetries
    ? Number(raw.maxRetries)
    : defaults.maxRetries
  const fallbackOnDenied =
    raw.fallbackOnDenied != null
      ? raw.fallbackOnDenied === 'true'
      : defaults.fallbackOnDenied
  const useCityCentroidFallback =
    raw.useCityCentroidFallback != null
      ? raw.useCityCentroidFallback === 'true'
      : defaults.useCityCentroidFallback

  return {
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? Math.floor(batchSize)
        : defaults.batchSize,
    maxBatches:
      maxBatches != null && Number.isFinite(maxBatches) && maxBatches > 0
        ? Math.floor(maxBatches)
        : null,
    delayMs:
      Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : defaults.delayMs,
    maxRetries:
      Number.isFinite(maxRetries) && maxRetries > 0
        ? Math.floor(maxRetries)
        : defaults.maxRetries,
    fallbackOnDenied,
    useCityCentroidFallback,
  }
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

type GeocodeResult = {
  lat: number
  lng: number
}

type GeocodeResponse = {
  result: GeocodeResult | null
  status: string | null
}

type GeocodeAttempt = {
  label: string
  query: string | null
}

async function geocodeAddress(
  apiKey: string,
  address: string,
  maxRetries: number
): Promise<GeocodeResponse> {
  let attempt = 0
  let lastStatus: string | null = null

  while (attempt < maxRetries) {
    attempt += 1
    const params = new URLSearchParams({ address, key: apiKey })
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`

    const response = await fetch(url)
    const data = (await response.json()) as {
      status?: string
      results?: Array<{
        geometry?: { location?: { lat: number; lng: number } }
      }>
    }

    lastStatus = data.status || null

    if (lastStatus === 'OK' && data.results?.length) {
      const location = data.results[0]?.geometry?.location
      if (location && isValidLatLng(location)) {
        return {
          result: { lat: location.lat, lng: location.lng },
          status: lastStatus,
        }
      }
      return { result: null, status: lastStatus }
    }

    if (lastStatus === 'OVER_QUERY_LIMIT' || lastStatus === 'UNKNOWN_ERROR') {
      await sleep(1000 * attempt)
      continue
    }

    return { result: null, status: lastStatus }
  }

  return { result: null, status: lastStatus }
}

function buildAddress(row: {
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
}): string | null {
  const parts = [
    row.address?.trim(),
    row.city?.trim(),
    row.state?.trim(),
    row.zip_code?.trim(),
  ].filter((part) => Boolean(part))

  if (parts.length === 0) return null
  return parts.join(', ')
}

function buildAttempts(row: {
  address?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
}): GeocodeAttempt[] {
  const address = row.address?.trim() || ''
  const city = row.city?.trim() || ''
  const state = row.state?.trim() || ''
  const zip = row.zip_code?.trim() || ''

  const isUndisclosed =
    address.toLowerCase().includes('undisclosed') ||
    (address.toLowerCase().includes('address') && !address.match(/\d/))

  const attempts: GeocodeAttempt[] = []

  if (!isUndisclosed && address) {
    attempts.push({
      label: 'full',
      query: buildAddress({ address, city, state, zip_code: zip }),
    })
    if (city || state) {
      attempts.push({
        label: 'street-city',
        query: buildAddress({ address, city, state }),
      })
    }
  }

  if (zip) {
    attempts.push({
      label: 'zip',
      query: buildAddress({ address: zip, city, state }),
    })
  }

  if (city || state) {
    attempts.push({
      label: 'city',
      query: buildAddress({ address: city, city: state }),
    })
  }

  return attempts.filter((attempt) => Boolean(attempt.query))
}

async function main() {
  const args = parseArgs(process.argv)
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_SERVER_API_KEY not set in env.')
  }

  const supabase = createStandaloneClient()

  if (args.useCityCentroidFallback) {
    const { data, error } = await supabase.rpc(
      'backfill_property_coordinates_city_centroid',
      { batch_limit: args.batchSize || null }
    )
    if (error) {
      throw new Error(
        error.message || 'Failed to backfill coordinates from city centroid'
      )
    }
    console.log(
      `[backfill-property-coordinates] city-centroid updated=${typeof data === 'number' ? data : 0}`
    )
    return
  }

  let batch = 0
  let lastId: string | null = null
  let updated = 0
  let skipped = 0
  let failed = 0
  const attemptCounts: Record<string, number> = {}
  const statusCounts: Record<string, number> = {}

  while (true) {
    batch += 1

    let query = supabase
      .from('properties')
      .select('id, address, city, state, zip_code')
      .eq('is_active', true)
      .is('coordinates', null)
      .order('id', { ascending: true })
      .limit(args.batchSize)

    if (lastId) {
      query = query.gt('id', lastId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message || 'Failed to load property batch')
    }

    if (!data || data.length === 0) {
      break
    }

    for (const row of data) {
      const attempts = buildAttempts(row)
      if (attempts.length === 0) {
        skipped += 1
        continue
      }

      let resolved: GeocodeResult | null = null
      let usedLabel = 'unknown'
      let lastStatus: string | null = null

      try {
        for (const attempt of attempts) {
          if (!attempt.query) continue
          const response = await geocodeAddress(
            apiKey,
            attempt.query,
            args.maxRetries
          )
          if (response.status) {
            lastStatus = response.status
          }
          if (response.result) {
            resolved = response.result
            usedLabel = attempt.label
            break
          }
        }

        if (!resolved) {
          skipped += 1
          if (lastStatus) {
            statusCounts[lastStatus] = (statusCounts[lastStatus] || 0) + 1
          } else {
            statusCounts.unknown = (statusCounts.unknown || 0) + 1
          }
          continue
        }

        const { error: updateError } = await supabase
          .from('properties')
          .update({
            coordinates: {
              type: 'Point',
              coordinates: [resolved.lng, resolved.lat],
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)

        if (updateError) {
          failed += 1
        } else {
          updated += 1
          attemptCounts[usedLabel] = (attemptCounts[usedLabel] || 0) + 1
        }
      } catch (_error) {
        failed += 1
      }

      if (args.delayMs > 0) {
        await sleep(args.delayMs)
      }
    }

    lastId = data[data.length - 1]?.id ?? lastId

    console.log(
      `[backfill-property-coordinates] batch=${batch} updated=${updated} skipped=${skipped} failed=${failed}`
    )

    if (args.maxBatches && batch >= args.maxBatches) break
  }

  console.log(
    `[backfill-property-coordinates] done updated=${updated} skipped=${skipped} failed=${failed}`
  )
  console.log(
    `[backfill-property-coordinates] attempts=${Object.entries(attemptCounts)
      .map(([label, count]) => `${label}:${count}`)
      .join(', ')}`
  )
  console.log(
    `[backfill-property-coordinates] statuses=${Object.entries(statusCounts)
      .map(([status, count]) => `${status}:${count}`)
      .join(', ')}`
  )

  if (args.fallbackOnDenied && statusCounts.REQUEST_DENIED && updated === 0) {
    const { data, error } = await supabase.rpc(
      'backfill_property_coordinates_city_centroid',
      { batch_limit: null }
    )
    if (error) {
      throw new Error(
        error.message || 'Failed to backfill coordinates from city centroid'
      )
    }
    console.log(
      `[backfill-property-coordinates] city-centroid updated=${typeof data === 'number' ? data : 0}`
    )
  }
}

main().catch((err) => {
  console.error('[backfill-property-coordinates] failed:', err)
  process.exit(1)
})
