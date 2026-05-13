#!/usr/bin/env tsx
/**
 * INGEST-001 follow-up: backfill `description` and `amenities` on
 * existing `properties` rows whose zpid is set but whose fields are NULL.
 *
 * The audit (qa-report-prod-2026-05-13-full-tour.md, Section 2) traced
 * half the LLM hallucination volume to a hardcoded `description: null,
 * amenities: null` in the migration transformer. PR #38 fixed the
 * transformer + the zillow detail route, so all NEW rows arrive
 * populated. This script back-applies the same enrichment to the 13K
 * existing rows by re-fetching each property's Zillow detail and
 * writing the missing columns.
 *
 * Re-runnable. The query naturally excludes already-filled rows, so a
 * second run after a partial completion picks up only the remainder.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-zillow-description-amenities.ts \
 *     [--limit=N] [--batchSize=N] [--delayMs=N] [--dryRun=true]
 *
 * Required env:
 *   RAPIDAPI_KEY     RapidAPI key with US Housing Market access
 *   RAPIDAPI_HOST    defaults to us-housing-market-data1.p.rapidapi.com
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service-role) for writes
 *
 * Cost note: each property = 1 RapidAPI call. At default 350ms delay,
 * 13K properties takes ~76 minutes. Bill rate per your RapidAPI plan.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createStandaloneClient } from '@/lib/supabase/standalone'
import { extractAmenities } from '@/app/api/admin/generate-vibes-zillow/route'
import type { Database } from '@/types/database'

type PropertiesUpdate = Database['public']['Tables']['properties']['Update']

interface Args {
  limit: number | null
  batchSize: number
  delayMs: number
  dryRun: boolean
}

const DEFAULT_HOST =
  process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

if (!RAPIDAPI_KEY) {
  console.error('RAPIDAPI_KEY missing in env')
  process.exit(1)
}

function parseArgs(argv: string[]): Args {
  const raw: Record<string, string> = {}
  argv.slice(2).forEach((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    if (k && v != null) raw[k] = v
  })
  const numOr = (v: string | undefined, d: number) => {
    if (v == null) return d
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : d
  }
  return {
    limit: raw.limit ? numOr(raw.limit, 0) || null : null,
    batchSize: numOr(raw.batchSize, 25),
    delayMs: numOr(raw.delayMs, 350),
    dryRun: raw.dryRun === 'true',
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchZillowDetail(zpid: string): Promise<{
  description: string | null
  amenities: string[] | null
} | null> {
  const url = `https://${DEFAULT_HOST}/property?zpid=${zpid}`
  try {
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY!,
        'X-RapidAPI-Host': DEFAULT_HOST,
      },
    })
    if (!res.ok) {
      console.warn(
        `[backfill] zpid=${zpid} status=${res.status} ${res.statusText}`
      )
      return null
    }
    const payload = (await res.json()) as Parameters<
      typeof extractAmenities
    >[0] & { description?: string }
    return {
      description:
        typeof payload.description === 'string' &&
        payload.description.trim().length > 0
          ? payload.description.trim()
          : null,
      amenities: extractAmenities(payload),
    }
  } catch (err) {
    console.warn(
      `[backfill] zpid=${zpid} fetch error:`,
      err instanceof Error ? err.message : err
    )
    return null
  }
}

// Codex P1: PostgREST/Supabase responses are capped by max_rows (the repo
// config sets 1000). For a 13K backfill, a single unpaginated select
// silently returns only the first chunk. We paginate explicitly using
// .range(from, to), ordered by id so each page is stable.
const PAGE_SIZE = 1000

interface TargetRow {
  id: string
  zpid: string
  description: string | null
  amenities: string[] | null
}

async function loadProperties(
  supabase: ReturnType<typeof createStandaloneClient>,
  limit: number | null
): Promise<TargetRow[]> {
  const out: TargetRow[] = []
  let offset = 0
  for (;;) {
    const remaining =
      limit != null ? limit - out.length : Number.POSITIVE_INFINITY
    if (remaining <= 0) break
    const pageSize = Math.min(PAGE_SIZE, remaining)
    const { data, error } = await supabase
      .from('properties')
      .select('id, zpid, description, amenities')
      .not('zpid', 'is', null)
      .or('description.is.null,amenities.is.null')
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) throw error
    const page = (data ?? []).filter(
      (row): row is TargetRow =>
        typeof row.id === 'string' && typeof row.zpid === 'string'
    )
    out.push(...page)
    if (page.length < pageSize) break
    offset += page.length
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv)
  console.log('[backfill] args:', args)

  const supabase = createStandaloneClient()
  const targets = await loadProperties(supabase, args.limit)
  console.log(`[backfill] ${targets.length} properties need enrichment`)

  if (args.dryRun) {
    console.log('[backfill] dry run — exiting')
    return
  }

  let succeeded = 0
  let skipped = 0
  let failed = 0
  let updated = 0

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!
    const result = await fetchZillowDetail(target.zpid)

    if (!result) {
      failed += 1
    } else {
      // Codex P2: only write fields that are actually NULL on this row.
      // Without this guard we'd overwrite curated `description` on
      // mixed-null rows whose `amenities` is the only null column.
      const patch: PropertiesUpdate = {}
      if (target.description === null && result.description) {
        patch.description = result.description
      }
      if (target.amenities === null && result.amenities) {
        patch.amenities = result.amenities
      }

      if (Object.keys(patch).length === 0) {
        skipped += 1
      } else {
        patch.updated_at = new Date().toISOString()
        const { error } = await supabase
          .from('properties')
          .update(patch)
          .eq('id', target.id)
        if (error) {
          console.warn(
            `[backfill] update failed id=${target.id}:`,
            error.message
          )
          failed += 1
        } else {
          updated += 1
        }
      }
      succeeded += 1
    }

    if ((i + 1) % args.batchSize === 0) {
      console.log(
        `[backfill] ${i + 1}/${targets.length} (updated=${updated} skipped=${skipped} failed=${failed})`
      )
    }
    if (i < targets.length - 1) await sleep(args.delayMs)
  }

  console.log(
    `[backfill] done. total=${targets.length} succeeded=${succeeded} updated=${updated} skipped=${skipped} failed=${failed}`
  )
}

main().catch((err) => {
  console.error('[backfill] fatal:', err)
  process.exit(1)
})
