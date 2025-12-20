#!/usr/bin/env tsx

/**
 * Backfill properties.neighborhood_id using neighborhood bounds containment.
 *
 * Usage examples:
 *   pnpm exec tsx scripts/backfill-property-neighborhoods.ts --batchSize=1000
 *   pnpm exec tsx scripts/backfill-property-neighborhoods.ts --maxBatches=1
 *   pnpm exec tsx scripts/backfill-property-neighborhoods.ts --targetZpids=123,456
 *   pnpm exec tsx scripts/backfill-property-neighborhoods.ts --targetIds=uuid,uuid
 *
 * Optional:
 *   ENV_FILE=.env.prod pnpm exec tsx scripts/backfill-property-neighborhoods.ts --batchSize=2000
 */

import { config } from 'dotenv'
const envFile = process.env.ENV_FILE || '.env.local'
config({ path: envFile, override: true })
if (envFile !== '.env.local') {
  config({ path: '.env.local' })
}
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Args = {
  batchSize: number
  maxBatches: number | null
  targetZpids: string[] | null
  targetIds: string[] | null
}

function parseArgs(argv: string[]): Args {
  const defaults: Args = {
    batchSize: 1000,
    maxBatches: null,
    targetZpids: null,
    targetIds: null,
  }

  const raw: Record<string, string> = {}
  argv.slice(2).forEach((arg) => {
    const [k, v] = arg.replace(/^--/, '').split('=')
    if (k && v != null) raw[k] = v
  })

  const batchSize = raw.batchSize ? Number(raw.batchSize) : defaults.batchSize
  const maxBatches =
    raw.maxBatches != null ? Number(raw.maxBatches) : defaults.maxBatches
  const targetZpids =
    raw.targetZpids != null
      ? raw.targetZpids
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : defaults.targetZpids
  const targetIds =
    raw.targetIds != null
      ? raw.targetIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : defaults.targetIds

  if (targetIds) {
    const invalid = targetIds.filter((id) => !UUID_RE.test(id))
    if (invalid.length > 0) {
      throw new Error(
        `Invalid --targetIds value(s): ${invalid.join(', ')} (expected UUIDs)`
      )
    }
  }

  return {
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? Math.floor(batchSize)
        : defaults.batchSize,
    maxBatches:
      maxBatches != null && Number.isFinite(maxBatches) && maxBatches > 0
        ? Math.floor(maxBatches)
        : null,
    targetZpids: targetZpids && targetZpids.length > 0 ? targetZpids : null,
    targetIds: targetIds && targetIds.length > 0 ? targetIds : null,
  }
}

async function countCandidates(
  supabase: ReturnType<typeof createStandaloneClient>,
  args: Args
): Promise<number> {
  let query = supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('neighborhood_id', null)
    .not('coordinates', 'is', null)

  if (args.targetZpids) {
    query = query.in('zpid', args.targetZpids)
  }
  if (args.targetIds) {
    query = query.in('id', args.targetIds)
  }

  const { count, error } = await query
  if (error) {
    throw new Error(error.message || 'Failed to count candidate properties')
  }

  return count || 0
}

async function main() {
  const args = parseArgs(process.argv)
  const supabase = createStandaloneClient()

  const beforeCount = await countCandidates(supabase, args)
  console.log(
    `[backfill-property-neighborhoods] candidates=${beforeCount} batchSize=${args.batchSize}`
  )

  if (beforeCount === 0) {
    console.log('[backfill-property-neighborhoods] Nothing to update.')
    return
  }

  let totalUpdated = 0
  let batch = 0

  while (true) {
    batch += 1

    const { data, error } = await supabase.rpc(
      'backfill_property_neighborhoods',
      {
        target_zpids: args.targetZpids,
        target_ids: args.targetIds,
        batch_limit: args.batchSize,
      }
    )

    if (error) {
      throw new Error(
        error.message || 'RPC backfill_property_neighborhoods failed'
      )
    }

    const updated = typeof data === 'number' ? data : 0
    totalUpdated += updated

    console.log(
      `[backfill-property-neighborhoods] batch=${batch} updated=${updated} totalUpdated=${totalUpdated}`
    )

    if (updated === 0) break
    if (args.maxBatches && batch >= args.maxBatches) break
  }

  const afterCount = await countCandidates(supabase, args)
  console.log(
    `[backfill-property-neighborhoods] done totalUpdated=${totalUpdated} remaining=${afterCount}`
  )
}

main().catch((err) => {
  console.error('[backfill-property-neighborhoods] failed:', err)
  process.exit(1)
})
