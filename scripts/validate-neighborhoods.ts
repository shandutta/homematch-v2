#!/usr/bin/env tsx

/**
 * Geo-correctness gate for the neighborhood polygons. Asserts they are dense,
 * valid, and assign points to the correct city. Run this BEFORE any property
 * re-ingest and AFTER any neighborhood-data change — exits non-zero on failure
 * so it can gate a pipeline.
 *
 *   ENV_FILE=.env.prod pnpm exec tsx scripts/validate-neighborhoods.ts
 *
 * Backed by the validate_neighborhood_coverage() RPC (raw PostGIS lives there).
 */

import { config } from 'dotenv'
const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile, override: true })
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'

type Verdict = {
  sf_count: number
  oakland_count: number
  san_jose_count: number
  bay_neighborhoods: number
  invalid_bounds: number
  non_multipolygon: number
  invalid_bounds_global: number
  non_multipolygon_global: number
  distinct_srids: number[]
  inside_accuracy_pct: number
  sample_points: number
  downtown: {
    sf: string | null
    oakland: string | null
    san_jose: string | null
  }
}

async function main() {
  const supabase = createStandaloneClient()
  // .bind keeps the client's internal `rest` handle (see import-neighborhoods).
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string
  ) => Promise<{ data: unknown; error: { message: string } | null }>

  const { data, error } = await rpc('validate_neighborhood_coverage')
  if (error) {
    console.error('[validate-nb] RPC failed:', error.message)
    process.exit(1)
  }
  const v = data as Verdict
  console.log('[validate-nb] verdict:', JSON.stringify(v, null, 2))

  // The hard checks below are Bay-Area-scoped (that is the set the app assigns
  // against). Surface any out-of-region geometry cruft as an informational note
  // so it stays visible without false-failing the gate.
  const outOfRegionInvalid =
    (v.invalid_bounds_global ?? 0) - (v.invalid_bounds ?? 0)
  const outOfRegionNonMP =
    (v.non_multipolygon_global ?? 0) - (v.non_multipolygon ?? 0)
  if (outOfRegionInvalid > 0 || outOfRegionNonMP > 0) {
    console.warn(
      `[validate-nb] note: ${outOfRegionInvalid} invalid + ${outOfRegionNonMP} non-MultiPolygon row(s) exist OUTSIDE the Bay Area box (GIST-pruned; do not affect assignment).`
    )
  }

  const failures: string[] = []
  const check = (cond: boolean, msg: string) => {
    if (!cond) failures.push(msg)
  }

  check(v.sf_count >= 41, `SF neighborhoods ${v.sf_count} < 41`)
  check(
    v.oakland_count >= 100,
    `Oakland neighborhoods ${v.oakland_count} < 100`
  )
  check(
    v.san_jose_count >= 250,
    `San Jose neighborhoods ${v.san_jose_count} < 250`
  )
  check(v.invalid_bounds === 0, `${v.invalid_bounds} invalid polygon(s)`)
  check(
    v.non_multipolygon === 0,
    `${v.non_multipolygon} non-MultiPolygon row(s)`
  )
  check(
    Array.isArray(v.distinct_srids) &&
      v.distinct_srids.length === 1 &&
      v.distinct_srids[0] === 4326,
    `SRIDs not exactly [4326]: ${JSON.stringify(v.distinct_srids)}`
  )
  check(
    v.inside_accuracy_pct >= 99.5,
    `inside-polygon accuracy ${v.inside_accuracy_pct}% < 99.5%`
  )
  check(!!v.downtown.sf, 'SF downtown point unassigned')
  check(!!v.downtown.oakland, 'Oakland downtown point unassigned')
  check(!!v.downtown.san_jose, 'San Jose downtown point unassigned')

  if (failures.length > 0) {
    console.error(`\n[validate-nb] FAIL (${failures.length}):`)
    for (const f of failures) console.error('  - ' + f)
    process.exit(1)
  }

  console.log(
    `\n[validate-nb] PASS — ${v.bay_neighborhoods} Bay neighborhoods; ${v.inside_accuracy_pct}% inside-polygon accuracy over ${v.sample_points} points; downtown SF=${v.downtown.sf}, Oakland=${v.downtown.oakland}, SJ=${v.downtown.san_jose}`
  )
}

void main().catch((err) => {
  console.error('[validate-nb] Fatal:', err)
  process.exitCode = 1
})
