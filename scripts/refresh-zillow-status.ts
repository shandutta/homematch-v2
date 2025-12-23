#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'
import type { Database } from '@/types/database'

const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

if (!RAPIDAPI_KEY) {
  console.error('RAPIDAPI_KEY missing')
  process.exit(1)
}

type DetailsResponse = { listingStatus?: string; price?: number }
type PropertyUpdate = Database['public']['Tables']['properties']['Update']
type Args = {
  limit: number | null
  batchSize: number
  delayMs: number
  activeOnly: boolean
}

function parseArgs(argv: string[]): Args {
  const defaults: Args = {
    limit: Number(process.env.STATUS_REFRESH_MAX_ITEMS) || 600,
    batchSize: 25,
    delayMs: Number(process.env.STATUS_DETAIL_DELAY_MS) || 350,
    activeOnly: true,
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
  const activeOnly =
    raw.activeOnly != null ? raw.activeOnly === 'true' : defaults.activeOnly

  return {
    limit:
      limit != null && Number.isFinite(limit) && limit > 0 ? limit : null,
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? batchSize
        : defaults.batchSize,
    delayMs:
      Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : defaults.delayMs,
    activeOnly,
  }
}

function normalizeStatus(status?: string): {
  listing_status: string
  is_active: boolean
} {
  const s = (status || '').toLowerCase()
  if (
    s.includes('off') ||
    s.includes('not_for_sale') ||
    s.includes('removed') ||
    s === ''
  )
    return { listing_status: 'removed', is_active: false }
  if (s.includes('sold')) return { listing_status: 'sold', is_active: false }
  if (s.includes('pending') || s.includes('contingent'))
    return { listing_status: 'pending', is_active: true }
  return { listing_status: 'active', is_active: true }
}

async function fetchDetails(zpid: string) {
  const url = `https://${RAPIDAPI_HOST}/property-details?zpid=${encodeURIComponent(zpid)}`
  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY!,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  })
  if (res.status === 404) return { listingStatus: 'off_market' }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as DetailsResponse
}

async function main() {
  const args = parseArgs(process.argv)
  const supabase = createStandaloneClient()
  let query = supabase
    .from('properties')
    .select('id, zpid')
    .order('updated_at', { ascending: true, nullsFirst: true })
    .order('id', { ascending: true })

  if (args.activeOnly) {
    query = query.eq('is_active', true)
  }

  if (args.limit != null) {
    query = query.range(0, args.limit - 1)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('Failed to read properties', error?.message)
    process.exit(1)
  }

  console.log(
    `Refreshing status for ${data.length} properties (limit=${args.limit ?? 'all'}, activeOnly=${args.activeOnly})`
  )

  const batchSize = args.batchSize
  const requestDelayMs = args.delayMs
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const updates: PropertyUpdate[] = []

    for (const row of batch) {
      const zpid = (row.zpid as string | null) || ''
      if (!zpid) continue
      try {
        const details = await fetchDetails(zpid)
        const norm = normalizeStatus(details?.listingStatus)
        const normalizedPrice: number | undefined =
          typeof details?.price === 'number'
            ? Math.round(details.price)
            : undefined
        updates.push({
          id: row.id as string,
          listing_status: norm.listing_status,
          is_active: norm.is_active,
          price: normalizedPrice,
          updated_at: new Date().toISOString(),
        })
      } catch (err) {
        console.warn(`details failed for ${zpid}: ${(err as Error).message}`)
      }
      await delay(requestDelayMs)
    }

    if (updates.length > 0) {
      const { error: upErr } = await supabase
        .from('properties')
        .upsert(
          updates as unknown as Database['public']['Tables']['properties']['Insert'][]
        )
      if (upErr) {
        console.error('Update failed:', upErr.message)
      } else {
        console.log(
          `Updated ${updates.length} records (batch ${i + 1}-${i + batch.length})`
        )
      }
    }

    // Gentle pacing
    await delay(requestDelayMs)
  }

  console.log('Status refresh completed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
