import { NextResponse } from 'next/server'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import type { PropertyInsert } from '@/types/database'

const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const CRON_SECRET =
  process.env.STATUS_REFRESH_CRON_SECRET || process.env.ZILLOW_CRON_SECRET

const DEFAULT_BATCH_SIZE = Number(process.env.STATUS_DETAIL_BATCH_LIMIT) || 60
const DEFAULT_DELAY_MS = Number(process.env.STATUS_DETAIL_DELAY_MS) || 600
const DEFAULT_MAX_ITEMS = Number(process.env.STATUS_REFRESH_MAX_ITEMS) || 430
const DEFAULT_MAX_RUNTIME_MS =
  Number(process.env.STATUS_REFRESH_MAX_RUNTIME_MS) || 280_000
const DEADLINE_BUFFER_MS = Number(
  process.env.STATUS_REFRESH_DEADLINE_BUFFER_MS || 5_000
)

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
  if (
    s.includes('off') ||
    s.includes('not_for_sale') ||
    s.includes('removed') ||
    s === ''
  ) {
    return { listing_status: 'removed', is_active: false }
  }
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
    if (res.status === 404) return { homeStatus: 'off_market' }
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
  try {
    if (!CRON_SECRET) {
      return NextResponse.json(
        { error: 'CRON secret not set' },
        { status: 500 }
      )
    }
    if (!RAPIDAPI_KEY) {
      return NextResponse.json(
        { error: 'RAPIDAPI_KEY missing' },
        { status: 503 }
      )
    }

    const url = new URL(req.url)
    const headerSecret = req.headers.get('x-cron-secret')
    const querySecret = url.searchParams.get('cron_secret')
    const maxItemsInput = Number(url.searchParams.get('limit'))
    const maxItems = Math.max(
      1,
      Math.min(
        Number.isFinite(maxItemsInput) && maxItemsInput > 0
          ? maxItemsInput
          : DEFAULT_MAX_ITEMS,
        DEFAULT_MAX_ITEMS
      )
    )
    const batchSizeInput = Number(url.searchParams.get('batchSize'))
    const batchSize = Math.min(
      Number.isFinite(batchSizeInput) && batchSizeInput > 0
        ? batchSizeInput
        : DEFAULT_BATCH_SIZE,
      maxItems
    )
    const delayInput = Number(url.searchParams.get('delayMs'))
    const delayMs =
      Number.isFinite(delayInput) && delayInput >= 0
        ? delayInput
        : DEFAULT_DELAY_MS
    const maxRuntimeInput = Number(url.searchParams.get('maxRuntimeMs'))
    const maxRuntimeMs = Math.min(
      Number.isFinite(maxRuntimeInput) && maxRuntimeInput > 0
        ? maxRuntimeInput
        : DEFAULT_MAX_RUNTIME_MS,
      DEFAULT_MAX_RUNTIME_MS
    )
    const start = Date.now()
    const deadline = start + maxRuntimeMs
    const stopWindowMs = Math.min(
      DEADLINE_BUFFER_MS,
      Math.max(1_000, Math.floor(maxRuntimeMs * 0.05))
    )

    if (headerSecret !== CRON_SECRET && querySecret !== CRON_SECRET) {
      return NextResponse.json({ error: 'unauthorized cron' }, { status: 401 })
    }

    const supabase = createStandaloneClient()
    const { data, error } = await supabase
      .from('properties')
      .select(
        'id, zpid, address, city, state, zip_code, bedrooms, bathrooms, price, listing_status, is_active'
      )
      .order('updated_at', { ascending: true, nullsFirst: true })
      .order('id', { ascending: true })
      .range(0, Math.min(batchSize, maxItems) - 1)

    if (error || !data) {
      console.error('[status-refresh] failed to load properties', {
        error: error?.message,
      })
      return NextResponse.json(
        { error: error?.message || 'failed to load properties' },
        { status: 500 }
      )
    }

    const updates: PropertyInsert[] = []
    let requests = 0
    let skipped = 0
    let rateLimitHits = 0
    let processed = 0
    let offset = 0
    let rows = data
    let changed = 0
    let soldChanges = 0
    let removedChanges = 0
    let pendingChanges = 0
    let activeChanges = 0
    const changeSamples: {
      zpid: string
      from: string
      to: string
      is_active: boolean
    }[] = []

    const shouldStop = () =>
      Date.now() >= deadline - stopWindowMs || processed >= maxItems

    while (rows.length > 0 && !shouldStop()) {
      for (const row of rows) {
        if (shouldStop()) break
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
          processed++
          const norm = normalizeStatus(details || { homeStatus: 'off_market' })
          const previousStatus = (row.listing_status as string | null) || ''
          const previousActive =
            typeof row.is_active === 'boolean' ? row.is_active : null

          const record = {
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
          }

          const statusChanged =
            previousStatus !== norm.listing_status ||
            (previousActive !== null && previousActive !== norm.is_active)

          if (statusChanged) {
            changed++
            if (norm.listing_status === 'sold') soldChanges++
            else if (norm.listing_status === 'removed') removedChanges++
            else if (norm.listing_status === 'pending') pendingChanges++
            else if (norm.listing_status === 'active') activeChanges++

            if (changeSamples.length < 50) {
              changeSamples.push({
                zpid,
                from: previousStatus || 'unknown',
                to: norm.listing_status,
                is_active: norm.is_active,
              })
            }
          }

          updates.push(record)
          await sleep(delayMs)
        } catch (err) {
          if ((err as Error).message.includes('429')) rateLimitHits++
          skipped++
          console.error('[status-refresh] fetchDetails failed', {
            zpid,
            error: err instanceof Error ? err.message : err,
          })
          await sleep(delayMs)
        }
      }

      offset += rows.length
      if (shouldStop()) break
      if (offset >= maxItems) break

      const { data: nextPage, error: nextError } = await supabase
        .from('properties')
        .select(
          'id, zpid, address, city, state, zip_code, bedrooms, bathrooms, price, listing_status, is_active'
        )
        .order('updated_at', { ascending: true, nullsFirst: true })
        .order('id', { ascending: true })
        .range(offset, Math.min(offset + batchSize - 1, maxItems - 1))

      if (nextError) {
        console.error('[status-refresh] pagination fetch failed', {
          error: nextError.message,
          offset,
        })
        return NextResponse.json(
          {
            error: nextError.message,
            updated: updates.length,
            requests,
            skipped,
            processed,
          },
          { status: 500 }
        )
      }

      rows = nextPage || []
      if (rows.length === 0) break
    }

    if (updates.length > 0) {
      const { error: upErr } = await supabase
        .from('properties')
        .upsert(updates, {
          onConflict: 'id',
        })
      if (upErr) {
        console.error('[status-refresh] upsert failed', {
          error: upErr.message,
          updates: updates.length,
        })
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
      processed,
      changed,
      soldChanges,
      removedChanges,
      pendingChanges,
      activeChanges,
      changeSamples,
      maxItems,
      batchSize,
      delayMs,
      rateLimitHits,
      elapsedMs: Date.now() - start,
      maxRuntimeMs,
    })
  } catch (err) {
    console.error('[status-refresh] unhandled error', {
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
    })
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
