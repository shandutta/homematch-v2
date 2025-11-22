#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'

async function main() {
  const supabase = createStandaloneClient()

  const superset: { city: string; listing_status: string | null }[] = []
  const pageSize = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('properties')
      .select('city, listing_status')
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error(
        'Failed to fetch property stats:',
        error?.message || 'unknown error'
      )
      process.exit(1)
    }

    if (!data || data.length === 0) break
    superset.push(
      ...data.map((d) => ({
        city: d.city as string,
        listing_status: d.listing_status as string | null,
      }))
    )
    if (data.length < pageSize) break
    offset += pageSize
  }

  const map = new Map<
    string,
    { total: number; statuses: Record<string, number> }
  >()

  superset.forEach((row: any) => {
    const city = (row.city as string) || 'Unknown'
    const status = (row.listing_status as string) || 'unknown'
    if (!map.has(city)) {
      map.set(city, { total: 0, statuses: {} })
    }
    const entry = map.get(city)!
    entry.total += 1
    entry.statuses[status] = (entry.statuses[status] || 0) + 1
  })

  const sorted = Array.from(map.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  )

  let grandTotal = 0
  for (const [city, info] of sorted) {
    grandTotal += info.total
    const statusStr = Object.entries(info.statuses)
      .sort((a, b) => b[1] - a[1])
      .map(([s, c]) => `${s}:${c}`)
      .join(', ')
    console.log(`${city.padEnd(18)} total=${info.total} (${statusStr})`)
  }
  console.log(`Grand total: ${grandTotal}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
