#!/usr/bin/env tsx

/**
 * Report vibes backfill status for the same selection logic used by
 * `scripts/backfill-vibes.ts` (top N properties by `created_at desc`).
 *
 * Usage (prod):
 *   bash -lc 'set -a; source .env.prod; set +a; pnpm exec tsx scripts/report-vibes-backfill.ts --limit=10'
 */

import { config } from 'dotenv'
const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile })
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'
import { VibesService } from '@/lib/services/vibes/vibes-service'

type Args = {
  limit: number
  minPrice: number
  offset: number
}

function parseArgs(argv: string[]): Args {
  const raw: Record<string, string> = {}
  argv.slice(2).forEach((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=')
    if (k && v != null) raw[k] = v
  })

  const limit = raw.limit ? Number(raw.limit) : 10
  const minPrice = raw.minPrice ? Number(raw.minPrice) : 100000
  const offset = raw.offset ? Number(raw.offset) : 0

  return {
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
    minPrice: Number.isFinite(minPrice) && minPrice >= 0 ? minPrice : 100000,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
  }
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
  const args = parseArgs(process.argv)
  const supabase = createStandaloneClient()

  const supabaseHost = safeHost(process.env.SUPABASE_URL)
  console.log(
    `[report-vibes-backfill] Env loaded from ${envFile} (supabaseHost=${supabaseHost || 'unknown'})`
  )

  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select(
      'id, zpid, address, city, state, created_at, images, price, bedrooms, bathrooms, square_feet, property_type, year_built'
    )
    .not('zpid', 'is', null)
    .gte('price', args.minPrice)
    .order('created_at', { ascending: false })
    .range(args.offset, args.offset + args.limit - 1)

  if (propsError) {
    throw new Error(`Failed to load properties: ${propsError.message}`)
  }

  const rows = properties || []
  if (rows.length === 0) {
    console.log('[report-vibes-backfill] No properties matched query.')
    return
  }

  const ids = rows.map((p) => p.id)

  const { data: vibes, error: vibesError } = await supabase
    .from('property_vibes')
    .select(
      'property_id, model_used, generation_cost_usd, images_analyzed, source_data_hash'
    )
    .in('property_id', ids)

  if (vibesError) {
    throw new Error(`Failed to load property_vibes: ${vibesError.message}`)
  }

  const vibesByPropertyId = new Map(
    (vibes || []).map((v) => [v.property_id, v])
  )

  console.log(
    `[report-vibes-backfill] Showing ${rows.length} properties (offset=${args.offset}, minPrice=${args.minPrice})`
  )

  let ok = 0
  let missing = 0

  for (const p of rows) {
    const v: any = vibesByPropertyId.get(p.id)
    const hasVibes = Boolean(v)
    const currentHash = VibesService.generateSourceHash(p as any)
    const stale =
      hasVibes && v?.source_data_hash && v.source_data_hash !== currentHash

    if (!hasVibes) missing++
    else if (!stale) ok++

    const images = Array.isArray((p as any).images) ? (p as any).images : []
    const analyzed = Array.isArray(v?.images_analyzed) ? v.images_analyzed : []
    const first = images[0] ? String(images[0]) : ''

    console.log(
      [
        !hasVibes ? 'MISSING' : stale ? 'STALE' : 'OK',
        p.id,
        `zpid=${p.zpid ?? 'null'}`,
        `imgs=${images.length}`,
        first ? `host=${safeHost(first)}` : 'host=',
        hasVibes ? `analyzed=${analyzed.length}` : null,
        hasVibes ? `cost=${v.generation_cost_usd ?? 'null'}` : null,
        hasVibes ? `hash=${stale ? 'mismatch' : 'match'}` : null,
        (p.address || '').slice(0, 50),
      ]
        .filter(Boolean)
        .join(' | ')
    )
  }

  const staleCount = rows.filter((p) => {
    const v: any = vibesByPropertyId.get(p.id)
    if (!v?.source_data_hash) return false
    return v.source_data_hash !== VibesService.generateSourceHash(p as any)
  }).length

  console.log(
    `[report-vibes-backfill] Summary: ok=${ok} stale=${staleCount} missing=${missing}`
  )
}

main().catch((err) => {
  console.error(
    '[report-vibes-backfill] Fatal:',
    err instanceof Error ? err.message : err
  )
  process.exit(1)
})
