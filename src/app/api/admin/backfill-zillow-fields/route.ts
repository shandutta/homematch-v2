// @service-role-capability: ingest follow-up. Periodically picks up
// properties whose `description` or `amenities` arrived NULL from the
// initial Zillow ingest (which happens whenever the Zillow detail
// payload was missing those fields at first fetch) and re-fetches them.
// Service-role bypass is bounded to the property rows whose zpid the
// route owns and only writes columns that are currently NULL.
// TODO(D1 follow-up): replace with a fully Clerk-aware Supabase JWT
// setup so the anon-key client can satisfy RLS and we can drop the
// service-role wrapper entirely.
/**
 * POST /api/admin/backfill-zillow-fields
 *
 * Anti-redundancy companion to scripts/backfill-zillow-description-amenities.ts.
 * Designed to run as a Vercel cron job: each invocation does a bounded
 * page of work (default 600 rows / ~3.5 minutes) so the 300s function
 * limit is never the bottleneck. Re-run weekly to catch any new rows
 * whose initial Zillow fetch returned an empty description/amenities
 * payload.
 *
 * Cron-secret-gated. Reuses extractAmenities() from the zillow detail
 * route so the field-mapping logic stays in exactly one place.
 */
import { NextResponse } from 'next/server'
import { createStandaloneClient } from '@/lib/supabase/standalone'
import { rateLimitAdminRoute } from '@/lib/api/admin-rate-limit'
import { ApiErrorHandler } from '@/lib/api/errors'
import { fetchWithTimeout } from '@/lib/api/fetch-timeout'
import {
  isPaidRapidApiApproved,
  RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE,
} from '@/lib/api/rapidapi-approval-gate'
import { extractAmenities } from '@/app/api/admin/generate-vibes-zillow/route'

const RAPIDAPI_HOST =
  process.env.RAPIDAPI_HOST || 'us-housing-market-data1.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
const CRON_SECRET =
  process.env.BACKFILL_ZILLOW_CRON_SECRET ||
  process.env.STATUS_REFRESH_CRON_SECRET ||
  process.env.ZILLOW_CRON_SECRET

const DEFAULT_BATCH_LIMIT = Number(process.env.BACKFILL_BATCH_LIMIT) || 600
const DEFAULT_DELAY_MS = Number(process.env.BACKFILL_DELAY_MS) || 350
const MAX_BATCH_LIMIT = 1000
const PAGE_SIZE = 1000
const FETCH_TIMEOUT_MS = 10_000
const DEADLINE_BUFFER_MS = 5_000
const FUNCTION_DEADLINE_MS = 280_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface TargetRow {
  id: string
  zpid: string
  description: string | null
  amenities: string[] | null
}

const isString = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0

async function fetchZillowDetail(zpid: string): Promise<{
  description: string | null
  amenities: string[] | null
} | null> {
  const url = `https://${RAPIDAPI_HOST}/property?zpid=${zpid}`
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY!,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
      timeoutMs: FETCH_TIMEOUT_MS,
      timeoutMessage: 'Zillow detail fetch timed out',
    })
    if (!res.ok) return null
    /* eslint-disable @typescript-eslint/consistent-type-assertions */
    // Cast: Zillow detail payload shape is documented externally and
    // extractAmenities() takes the same broad shape via its declared
    // ZillowPropertyResponse interface. The cast localizes the trust
    // boundary instead of threading runtime validation through both
    // call sites.
    const payload = (await res.json()) as Parameters<
      typeof extractAmenities
    >[0] & { description?: unknown }
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
    return {
      description:
        typeof payload.description === 'string' &&
        payload.description.trim().length > 0
          ? payload.description.trim()
          : null,
      amenities: extractAmenities(payload),
    }
  } catch {
    return null
  }
}

async function loadPageOfTargets(
  supabase: ReturnType<typeof createStandaloneClient>,
  limit: number
): Promise<TargetRow[]> {
  const out: TargetRow[] = []
  let offset = 0
  while (out.length < limit) {
    const remaining = limit - out.length
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
      (row): row is TargetRow => isString(row.id) && isString(row.zpid)
    )
    out.push(...page)
    if (page.length < pageSize) break
    offset += page.length
  }
  return out.slice(0, limit)
}

async function handle(req: Request) {
  try {
    const url = new URL(req.url)
    // Vercel cron sends GET with `Authorization: Bearer <CRON_SECRET>`.
    // Manual / curl invocations use `x-cron-secret` or ?cron_secret=.
    const headerSecret = req.headers.get('x-cron-secret')
    const querySecret = url.searchParams.get('cron_secret')
    const authHeader = req.headers.get('authorization')
    const bearerSecret = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null
    if (
      !CRON_SECRET ||
      (headerSecret !== CRON_SECRET &&
        querySecret !== CRON_SECRET &&
        bearerSecret !== CRON_SECRET)
    ) {
      return ApiErrorHandler.unauthorized('unauthorized cron')
    }

    const rateLimited = await rateLimitAdminRoute(
      req,
      'admin:backfill-zillow-fields'
    )
    if (rateLimited) return rateLimited

    if (!RAPIDAPI_KEY) {
      return ApiErrorHandler.serviceUnavailable('upstream unavailable')
    }
    if (!isPaidRapidApiApproved()) {
      return ApiErrorHandler.serviceUnavailable(
        RAPIDAPI_PAID_APPROVAL_REQUIRED_MESSAGE
      )
    }

    const limitInput = Number(url.searchParams.get('limit'))
    const limit = Math.max(
      1,
      Math.min(
        Number.isFinite(limitInput) && limitInput > 0
          ? limitInput
          : DEFAULT_BATCH_LIMIT,
        MAX_BATCH_LIMIT
      )
    )
    const delayInput = Number(url.searchParams.get('delayMs'))
    const delayMs =
      Number.isFinite(delayInput) && delayInput >= 0
        ? delayInput
        : DEFAULT_DELAY_MS

    const supabase = createStandaloneClient()
    const targets = await loadPageOfTargets(supabase, limit)

    const start = Date.now()
    const deadline = start + FUNCTION_DEADLINE_MS - DEADLINE_BUFFER_MS

    let processed = 0
    let updated = 0
    let skipped = 0
    let failed = 0

    for (const target of targets) {
      if (Date.now() >= deadline) break
      processed += 1
      const result = await fetchZillowDetail(target.zpid)
      if (!result) {
        failed += 1
      } else {
        // Only write columns that are currently NULL — never overwrite
        // curated values. Same guard the script uses.
        const patch: Record<string, unknown> = {}
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
          /* eslint-disable @typescript-eslint/consistent-type-assertions */
          // Cast: the supabase generated types narrow update payloads
          // to a structural Update<TableName> shape; the dynamic patch
          // here is constrained to the two columns above.
          const { error } = await supabase
            .from('properties')
            .update(patch as Record<string, never>)
            .eq('id', target.id)
          /* eslint-enable @typescript-eslint/consistent-type-assertions */
          if (error) failed += 1
          else updated += 1
        }
      }
      if (delayMs > 0) await sleep(delayMs)
    }

    return NextResponse.json({
      ok: true,
      summary: {
        eligible: targets.length,
        processed,
        updated,
        skipped,
        failed,
        elapsedMs: Date.now() - start,
        deadlineHit: processed < targets.length,
      },
    })
  } catch (err) {
    return ApiErrorHandler.serverError(
      err instanceof Error ? err.message : 'backfill failed',
      err
    )
  }
}

export const GET = handle
export const POST = handle
