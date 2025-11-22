#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'
import type { Database } from '@/types/database'

const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'zillow-com1.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

if (!RAPIDAPI_KEY) {
  console.error('RAPIDAPI_KEY missing')
  process.exit(1)
}

type DetailsResponse = { listingStatus?: string; price?: number }
type PropertyUpdate = Database['public']['Tables']['properties']['Update']

function normalizeStatus(status?: string): {
  listing_status: string
  is_active: boolean
} {
  const s = (status || '').toLowerCase()
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
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as DetailsResponse
}

async function main() {
  const supabase = createStandaloneClient()
  const { data, error } = await supabase.from('properties').select('id, zpid')

  if (error || !data) {
    console.error('Failed to read properties', error?.message)
    process.exit(1)
  }

  console.log(`Refreshing status for ${data.length} properties`)

  const batchSize = 25
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const updates: PropertyUpdate[] = []

    await Promise.all(
      batch.map(async (row) => {
        const zpid = (row.zpid as string | null) || ''
        if (!zpid) return
        try {
          const details = await fetchDetails(zpid)
          if (!details) return
          const norm = normalizeStatus(details.listingStatus)
          const normalizedPrice: number | undefined =
            typeof details.price === 'number'
              ? Math.round(details.price)
              : undefined
          updates.push({
            id: row.id as string,
            listing_status: norm.listing_status,
            is_active: norm.is_active,
            price: normalizedPrice,
          })
        } catch (err) {
          console.warn(`details failed for ${zpid}: ${(err as Error).message}`)
        }
      })
    )

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
    await delay(1200)
  }

  console.log('Status refresh completed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
