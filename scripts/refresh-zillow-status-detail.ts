#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'

const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

if (!RAPIDAPI_KEY) {
  console.error('RAPIDAPI_KEY missing')
  process.exit(1)
}

const BATCH_LIMIT = Number(process.env.STATUS_DETAIL_BATCH_LIMIT) || 200
// Default pacing aligned to the 3 rps RapidAPI limit (with headroom).
const REQUEST_DELAY_MS = Number(process.env.STATUS_DETAIL_DELAY_MS) || 350

type DetailsResponse = {
  homeStatus?: string
  listingSubType?: {
    is_pending?: boolean
  }
  price?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function normalizeStatus(detail: DetailsResponse): {
  listing_status: string
  is_active: boolean
} {
  const s = (detail.homeStatus || '').toLowerCase()
  if (s.includes('sold')) return { listing_status: 'sold', is_active: false }
  if (
    s.includes('pending') ||
    s.includes('contingent') ||
    detail.listingSubType?.is_pending
  )
    return { listing_status: 'pending', is_active: true }
  return { listing_status: 'active', is_active: true }
}

async function fetchDetails(zpid: string) {
  const url = `https://${RAPIDAPI_HOST}/property?zpid=${encodeURIComponent(zpid)}`
  let attempt = 0
  while (attempt < 3) {
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY!,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    })
    if (res.status === 404) return null
    if (res.status === 429) {
      attempt++
      const backoff = 3000 * attempt
      console.warn(
        `429 for ${zpid}, backing off ${backoff}ms (attempt ${attempt}/3)`
      )
      await sleep(backoff)
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as DetailsResponse
  }
  throw new Error('HTTP 429 after retries')
}

async function main() {
  const supabase = createStandaloneClient()

  // Pull the first batch (ordered by updated_at asc to refresh oldest first)
  const { data, error } = await supabase
    .from('properties')
    .select(
      'id, zpid, address, city, state, zip_code, bedrooms, bathrooms, price'
    )
    .eq('is_active', true)
    .order('updated_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_LIMIT)

  if (error || !data) {
    console.error('Failed to load properties:', error?.message || 'unknown')
    process.exit(1)
  }

  console.log(
    `Refreshing status via details for ${data.length} properties (batch size=${BATCH_LIMIT})`
  )

  const updates: any[] = []
  let requests = 0
  for (const row of data) {
    const zpid = (row.zpid as string | null) || ''
    if (!zpid) continue
    // Ensure required fields to avoid NOT NULL violations
    if (
      !row.address ||
      !row.city ||
      !row.state ||
      !row.zip_code ||
      row.bedrooms === null ||
      row.bedrooms === undefined ||
      row.bathrooms === null ||
      row.bathrooms === undefined
    ) {
      continue
    }
    try {
      const details = await fetchDetails(zpid)
      requests++
      if (!details) continue
      const norm = normalizeStatus(details)
      updates.push({
        id: row.id,
        zpid,
        address: row.address,
        city: row.city,
        state: row.state,
        zip_code: row.zip_code,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        price:
          typeof details.price === 'number'
            ? Math.round(details.price)
            : row.price,
        listing_status: norm.listing_status,
        is_active: norm.is_active,
        updated_at: new Date().toISOString(),
      })
      await sleep(REQUEST_DELAY_MS)
    } catch (err) {
      console.warn(`details failed for ${zpid}: ${(err as Error).message}`)
      await sleep(REQUEST_DELAY_MS)
    }
  }

  if (updates.length > 0) {
    const { error: upErr } = await supabase.from('properties').upsert(updates, {
      onConflict: 'id',
    })
    if (upErr) {
      console.error('Failed to upsert refreshed statuses:', upErr.message)
      process.exit(1)
    }
  }

  console.log(
    `Status detail refresh done. Requests=${requests}, Rows updated=${updates.length}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
