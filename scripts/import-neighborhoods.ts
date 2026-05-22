#!/usr/bin/env tsx

/**
 * Import official neighborhood boundary polygons for the 3 dominant Bay Area
 * markets (SF, Oakland, San Jose), REPLACING the sparse existing polygons for
 * those cities. All other cities are left untouched. Deletes the old per-city
 * rows (cascades their neighborhood_vibes, regenerated later) then loads the
 * official polygons via the import_neighborhood_polygon() RPC, which validates
 * (ST_MakeValid) and normalizes to MultiPolygon(4326).
 *
 * Sources (verified live):
 *   SF       data.sfgov.org/resource/j2bu-swwd.geojson   (nhood,    41, MultiPolygon, public domain)
 *   Oakland  data.oaklandca.gov/resource/sb4q-6bkc.geojson (neighbhd, 131, MultiPolygon, open)
 *   San Jose geo.sanjoseca.gov ArcGIS MapServer/549 (NAME, 297, Polygon via outSR=4326, open)
 *
 *   ENV_FILE=.env.prod pnpm exec tsx scripts/import-neighborhoods.ts --dryRun=true
 *   ENV_FILE=.env.prod pnpm exec tsx scripts/import-neighborhoods.ts
 */

import { config } from 'dotenv'
const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile, override: true })
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import { readFileSync } from 'node:fs'
import { createStandaloneClient } from '@/lib/supabase/standalone'

type Source = { city: string; nameField: string; url?: string; file?: string }

const SOURCES: Source[] = [
  {
    city: 'San Francisco',
    url: 'https://data.sfgov.org/resource/j2bu-swwd.geojson',
    nameField: 'nhood',
  },
  {
    city: 'Oakland',
    url: 'https://data.oaklandca.gov/resource/sb4q-6bkc.geojson',
    nameField: 'neighbhd',
  },
  {
    // geo.sanjoseca.gov firewalls the devbox datacenter IP, so this GeoJSON is
    // fetched locally and staged on disk; point --sjFile at the staged path.
    city: 'San Jose',
    file: process.env.SJ_FILE || '.logs/sanjose-nb.geojson',
    nameField: 'NAME',
  },
]

type Feature = {
  properties?: Record<string, unknown>
  geometry?: { type?: string } | null
}

function safeHost(url?: string | null): string {
  if (!url) return ''
  try {
    return new URL(url).host
  } catch {
    return ''
  }
}

async function main() {
  const dryRun = process.argv.slice(2).some((a) => a === '--dryRun=true')
  const supabase = createStandaloneClient()
  const supabaseHost = safeHost(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  )
  console.log(`[import-nb] supabaseHost=${supabaseHost} dryRun=${dryRun}`)

  // .bind is required: extracting supabase.rpc unbound loses `this` (the
  // client's internal `rest` handle) and throws at call time.
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    params?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>

  const totals = {
    fetched: 0,
    deleted: 0,
    inserted: 0,
    skipped: 0,
    errors: 0,
  }

  for (const src of SOURCES) {
    console.log(`\n[import-nb] === ${src.city} ===`)
    let features: Feature[] = []
    try {
      let json: { features?: Feature[] }
      if (src.file) {
        json = JSON.parse(readFileSync(src.file, 'utf8')) as {
          features?: Feature[]
        }
      } else {
        const res = await fetch(src.url as string, {
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
        json = (await res.json()) as { features?: Feature[] }
      }
      features = Array.isArray(json.features) ? json.features : []
    } catch (err) {
      console.error(
        `[import-nb] ${src.city} fetch failed: ${err instanceof Error ? err.message : String(err)}`
      )
      totals.errors++
      continue
    }
    console.log(`[import-nb] ${src.city}: fetched ${features.length} features`)
    totals.fetched += features.length

    if (dryRun) {
      const names = features
        .slice(0, 5)
        .map((f) => String(f.properties?.[src.nameField] ?? '?'))
      console.log(
        `[import-nb] ${src.city} sample names: ${names.join(', ')} | geom=${features[0]?.geometry?.type}`
      )
      continue
    }

    // Delete existing rows for this city (cascades their neighborhood_vibes).
    const { error: delErr, count } = await supabase
      .from('neighborhoods')
      .delete({ count: 'exact' })
      .ilike('city', src.city)
    if (delErr) {
      console.error(`[import-nb] ${src.city} delete failed: ${delErr.message}`)
      totals.errors++
      continue
    }
    console.log(
      `[import-nb] ${src.city}: deleted ${count ?? '?'} existing rows`
    )
    totals.deleted += count ?? 0

    let inserted = 0
    for (const f of features) {
      const name = String(f.properties?.[src.nameField] ?? '').trim()
      const geom = f.geometry
      if (
        !name ||
        !geom ||
        (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')
      ) {
        totals.skipped++
        continue
      }
      const { error } = await rpc('import_neighborhood_polygon', {
        p_name: name,
        p_city: src.city,
        p_state: 'CA',
        p_geojson: geom,
      })
      if (error) {
        console.warn(
          `[import-nb] insert failed (${src.city}/${name}): ${error.message}`
        )
        totals.errors++
        continue
      }
      inserted++
    }
    console.log(`[import-nb] ${src.city}: inserted ${inserted}`)
    totals.inserted += inserted
  }

  console.log(
    `\n[import-nb] TOTAL fetched=${totals.fetched} deleted=${totals.deleted} inserted=${totals.inserted} skipped=${totals.skipped} errors=${totals.errors}`
  )
}

void main().catch((err) => {
  console.error('[import-nb] Fatal:', err)
  process.exitCode = 1
})
