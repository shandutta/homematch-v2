#!/usr/bin/env tsx

import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'
import type { Database } from '@/types/database'

const ALLOWED_CITIES = new Set([
  'SAN FRANCISCO',
  'OAKLAND',
  'BERKELEY',
  'SAN JOSE',
  'PALO ALTO',
  'MOUNTAIN VIEW',
  'SUNNYVALE',
  'SANTA CLARA',
  'FREMONT',
  'HAYWARD',
  'WALNUT CREEK',
  'CONCORD',
  'SAN MATEO',
  'REDWOOD CITY',
  'MENLO PARK',
  'SAN RAFAEL',
  'SANTA ROSA',
  'NAPA',
  'VALLEJO',
  'DALY CITY',
  'SOUTH SAN FRANCISCO',
  'SAN BRUNO',
  'BURLINGAME',
  'MILLBRAE',
  'BELMONT',
  'FOSTER CITY',
  'LOS ALTOS',
  'LOS ALTOS HILLS',
  'CUPERTINO',
  'CAMPBELL',
  'SARATOGA',
  'LOS GATOS',
  'MILPITAS',
  'SAN LEANDRO',
  'ALAMEDA',
  'EMERYVILLE',
  'ALBANY',
  'RICHMOND',
  'EL CERRITO',
  'PLEASANTON',
  'DUBLIN',
  'LIVERMORE',
  'SAN RAMON',
  'DANVILLE',
  'LAFAYETTE',
  'ORINDA',
  'MARTINEZ',
  'PITTSBURG',
  'ANTIOCH',
  'BRENTWOOD',
  'BENICIA',
  'PETALUMA',
  'NOVATO',
  'MILL VALLEY',
  'SAUSALITO',
  'LARKSPUR',
  'CORTE MADERA',
  'TIBURON',
  'SAN ANSELMO',
  'FAIRFAX',
  'SONOMA',
])

type PropertyRow = Pick<
  Database['public']['Tables']['properties']['Row'],
  'id' | 'city' | 'zpid'
>

async function deleteByIds(
  client: ReturnType<typeof createStandaloneClient>,
  ids: string[]
) {
  if (ids.length === 0) return
  const { error } = await client.from('properties').delete().in('id', ids)
  if (error) {
    throw new Error(error.message || 'Delete failed')
  }
}

async function softDisableByIds(
  client: ReturnType<typeof createStandaloneClient>,
  ids: string[]
) {
  if (ids.length === 0) return
  const { error } = await client
    .from('properties')
    .update({ is_active: false, listing_status: 'removed' })
    .in('id', ids)
  if (error) {
    throw new Error(error.message || 'Soft disable failed')
  }
}

async function main() {
  const supabase = createStandaloneClient()

  const pageSize = 1000
  let offset = 0
  let rows: PropertyRow[] = []

  while (true) {
    const { data, error } = await supabase
      .from('properties')
      .select('id, city, zpid', { count: 'exact' })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error('Failed to read properties', error.message)
      process.exit(1)
    }
    if (!data || data.length === 0) break
    rows = rows.concat(data)
    offset += pageSize
    if (data.length < pageSize) break
  }

  const toDelete: string[] = []

  rows.forEach((row) => {
    const zpid = row.zpid ?? ''
    const city = (row.city ?? '').trim().toUpperCase()

    if (zpid.startsWith('dev-')) {
      toDelete.push(row.id)
      return
    }

    if (!ALLOWED_CITIES.has(city)) {
      toDelete.push(row.id)
    }
  })

  console.log(
    `Identified ${toDelete.length} rows to delete (seeds + non-BA) out of ${rows.length}.`
  )

  const chunkSize = 100
  const failedDeletes: string[] = []
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize)
    try {
      await deleteByIds(supabase, chunk)
      console.log(`Deleted ${i + chunk.length}/${toDelete.length}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(
        `Delete failed for batch ${i}-${i + chunk.length - 1}, will soft-disable instead: ${message}`
      )
      failedDeletes.push(...chunk)
    }
  }

  if (failedDeletes.length > 0) {
    console.log(
      `Soft-disabling ${failedDeletes.length} rows due to FK constraints.`
    )
    for (let i = 0; i < failedDeletes.length; i += chunkSize) {
      const chunk = failedDeletes.slice(i, i + chunkSize)
      await softDisableByIds(supabase, chunk)
      console.log(`Soft-disabled ${i + chunk.length}/${failedDeletes.length}`)
    }
  }

  console.log('Cleanup completed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
