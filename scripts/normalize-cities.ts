#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { normalizeCityName } from '@/lib/ingestion/city-normalization'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import type { Database } from '@/types/database'

type PropertyUpdate = Database['public']['Tables']['properties']['Update']

async function main() {
  const supabase = createStandaloneClient()

  const pageSize = 1000
  let offset = 0
  const updates: PropertyUpdate[] = []

  while (true) {
    const { data, error } = await supabase
      .from('properties')
      .select('id, city')
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error('Failed to fetch properties:', error.message)
      process.exit(1)
    }
    if (!data || data.length === 0) break

    data.forEach((row) => {
      const currentCity = (row.city as string | null) || ''
      const normalized = normalizeCityName(currentCity)
      if (normalized !== currentCity) {
        updates.push({ id: row.id as string, city: normalized })
      }
    })

    if (data.length < pageSize) break
    offset += pageSize
  }

  console.log(`Found ${updates.length} rows needing city normalization.`)

  const chunkSize = 500
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize)
    const ids = chunk.map((c) => c.id).filter(Boolean) as string[]
    if (ids.length === 0) continue
    const city = chunk[0]?.city || ''
    const { error } = await supabase
      .from('properties')
      .update({ city })
      .in('id', ids)
    if (error) {
      console.error('Failed to upsert normalized cities:', error.message)
      process.exit(1)
    }
    console.log(`Updated ${i + chunk.length}/${updates.length}`)
  }

  console.log('City normalization completed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
