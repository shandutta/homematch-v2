#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import {
  defaultZipForCityState,
  CITY_ZIP_MAP,
} from '@/lib/ingestion/default-zips'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import { normalizeCityName } from '@/lib/ingestion/city-normalization'
import type { Database } from '@/types/database'

const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

if (!RAPIDAPI_KEY) {
  console.error('RAPIDAPI_KEY missing')
  process.exit(1)
}

// Derive city list from the default zip map keys
const CITY_LIST = Array.from(
  new Set(
    Object.keys(CITY_ZIP_MAP)
      .map((k) => k.split('|')[0])
      .map((c) => normalizeCityName(c))
  )
)

// RapidAPI supported values observed: ForSale, RecentlySold
const STATUSES: Array<'ForSale' | 'RecentlySold'> = ['ForSale', 'RecentlySold']
const MAX_PAGES = 5
const PAGE_SIZE = 50
const DELAY_MS = 350 // stay under 3 rps with headroom
type PropertyInsert = Database['public']['Tables']['properties']['Insert']

type SearchItem = {
  zpid?: string | number
  listingStatus?: string
  price?: number
  city?: string
  state?: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function toSearchItem(value: unknown): SearchItem {
  if (!isRecord(value)) return {}
  return {
    zpid:
      typeof value.zpid === 'string' || typeof value.zpid === 'number'
        ? value.zpid
        : undefined,
    listingStatus:
      typeof value.listingStatus === 'string' ? value.listingStatus : undefined,
    price: typeof value.price === 'number' ? value.price : undefined,
    city: typeof value.city === 'string' ? value.city : undefined,
    state: typeof value.state === 'string' ? value.state : undefined,
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

function toZpid(item: SearchItem): string | null {
  if (typeof item.zpid === 'number' || typeof item.zpid === 'string') {
    return String(item.zpid)
  }
  return null
}

async function fetchStatusPage(
  city: string,
  status: (typeof STATUSES)[number],
  page: number
): Promise<SearchItem[]> {
  const params = new URLSearchParams({
    location: `${city}, CA`,
    status_type: status,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  })
  const url = `https://${RAPIDAPI_HOST}/propertyExtendedSearch?${params.toString()}`
  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY!,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(
      `HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`
    )
  }
  const body = await res.json()
  const list = (() => {
    if (!isRecord(body)) return []
    if (Array.isArray(body.props)) return body.props
    if (Array.isArray(body.results)) return body.results
    if (isRecord(body.data) && Array.isArray(body.data.results)) {
      return body.data.results
    }
    return []
  })()
  return list.map(toSearchItem)
}

async function main() {
  const supabase = createStandaloneClient()
  let updated = 0
  let requests = 0

  // Build map of existing properties to preserve required fields on upsert
  const baseMap = new Map<
    string,
    {
      address: string
      city: string
      state: string
      zip_code: string | null
      bedrooms: number
      bathrooms: number
      price: number
    }
  >()
  {
    const pageSize = 1000
    let offset = 0
    while (true) {
      const { data, error } = await supabase
        .from('properties')
        .select(
          'zpid, address, city, state, zip_code, bedrooms, bathrooms, price'
        )
        .range(offset, offset + pageSize - 1)

      if (error) {
        console.error('Failed to load base property map:', error.message)
        process.exit(1)
      }
      if (!data || data.length === 0) break
      data.forEach((row) => {
        const zpid = row.zpid
        if (zpid) {
          baseMap.set(zpid, {
            address: row.address,
            city: row.city,
            state: row.state,
            zip_code: row.zip_code || null,
            bedrooms: row.bedrooms,
            bathrooms: row.bathrooms,
            price: row.price,
          })
        }
      })
      if (data.length < pageSize) break
      offset += pageSize
    }
  }

  for (const city of CITY_LIST) {
    for (const status of STATUSES) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        try {
          const items = await fetchStatusPage(city, status, page)
          requests++
          if (items.length === 0) break

          const updates = items
            .map((item): PropertyInsert | null => {
              const zpid = toZpid(item)
              if (!zpid) return null
              const base = baseMap.get(zpid)
              if (!base) return null // only update existing rows
              if (!base.address || !base.city || !base.state) return null
              const zip =
                base.zip_code ||
                defaultZipForCityState(base.city, base.state) ||
                null
              if (!zip) return null // avoid not-null violations
              const normStatus = normalizeStatus(item.listingStatus)
              const normalizedPrice: number | undefined =
                typeof item.price === 'number'
                  ? Math.round(item.price)
                  : undefined
              return {
                zpid,
                listing_status: normStatus.listing_status,
                is_active: normStatus.is_active,
                price: normalizedPrice ?? base.price,
                city: base.city,
                state: base.state,
                address: base.address,
                zip_code: zip,
                bedrooms: base.bedrooms,
                bathrooms: base.bathrooms,
              }
            })
            .filter((value): value is PropertyInsert => value !== null)

          if (updates.length > 0) {
            const payload = updates.map((u) => ({
              ...u,
              updated_at: new Date().toISOString(),
            }))
            const { error } = await supabase
              .from('properties')
              .upsert(payload, { onConflict: 'zpid' })
            if (error) {
              console.warn(
                `Update failed for ${city} status ${status} page ${page}: ${error.message}`
              )
            } else {
              updated += updates.length
            }
          }

          // If fewer than pageSize, no more pages
          if (items.length < PAGE_SIZE) break
          await sleep(DELAY_MS)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          console.warn(
            `Fetch failed for ${city} status ${status} page ${page}: ${message}`
          )
          break
        }
        // Basic pacing between every request even after errors
        await sleep(DELAY_MS)
      }
    }
  }

  console.log(
    `Status refresh done. Requests used: ${requests}. Rows upserted: ${updated}.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
