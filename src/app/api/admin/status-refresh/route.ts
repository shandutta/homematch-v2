import { NextResponse } from 'next/server'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import type { PropertyInsert } from '@/types/database'

const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'zillow-com1.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const CRON_SECRET =
  process.env.STATUS_REFRESH_CRON_SECRET || process.env.ZILLOW_CRON_SECRET

const DEFAULT_BATCH_LIMIT = Number(process.env.STATUS_DETAIL_BATCH_LIMIT) || 40
const DEFAULT_DELAY_MS = Number(process.env.STATUS_DETAIL_DELAY_MS) || 600

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
      await sleep(backoff)
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as DetailsResponse
  }
  throw new Error('HTTP 429 after retries')
}

export async function POST(req: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON secret not set' }, { status: 500 })
  }
  if (!RAPIDAPI_KEY) {
    return NextResponse.json({ error: 'RAPIDAPI_KEY missing' }, { status: 503 })
  }

  const url = new URL(req.url)
  const headerSecret = req.headers.get('x-cron-secret')
  const querySecret = url.searchParams.get('cron_secret')
  const limit = Number(url.searchParams.get('limit')) || DEFAULT_BATCH_LIMIT
  const delayMs =
    Number(url.searchParams.get('delayMs')) || DEFAULT_DELAY_MS || 600

  if (headerSecret !== CRON_SECRET && querySecret !== CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized cron' }, { status: 401 })
  }

  const supabase = createStandaloneClient()
  const { data, error } = await supabase
    .from('properties')
    .select(
      'id, zpid, address, city, state, zip_code, bedrooms, bathrooms, price'
    )
    .order('updated_at', { ascending: true, nullsFirst: true })
    .limit(limit)

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'failed to load properties' },
      { status: 500 }
    )
  }

  const updates: PropertyInsert[] = []
  let requests = 0
  let skipped = 0
  let rateLimitHits = 0

  for (const row of data) {
    const zpid = (row.zpid as string | null) || ''
    if (
      !zpid ||
      !row.address ||
      !row.city ||
      !row.state ||
      !row.zip_code ||
      row.bedrooms === null ||
      row.bedrooms === undefined ||
      row.bathrooms === null ||
      row.bathrooms === undefined
    ) {
      skipped++
      continue
    }

    try {
      const details = await fetchDetails(zpid)
      requests++
      if (!details) {
        await sleep(delayMs)
        continue
      }
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
      })
      await sleep(delayMs)
    } catch (err) {
      if ((err as Error).message.includes('429')) rateLimitHits++
      skipped++
      await sleep(delayMs)
    }
  }

  if (updates.length > 0) {
    const { error: upErr } = await supabase.from('properties').upsert(updates, {
      onConflict: 'id',
    })
    if (upErr) {
      return NextResponse.json(
        { error: upErr.message, updated: updates.length, requests, skipped },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    ok: true,
    requests,
    updated: updates.length,
    skipped,
    limit,
    delayMs,
    rateLimitHits,
  })
}
