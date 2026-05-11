/**
 * Ingest freshness: TTL-based staleness detection for already-ingested
 * records.
 *
 * The pipeline uses this to decide which previously-ingested rows deserve a
 * refresh on the next run. Two TTLs per source:
 *
 *   - `staleAfterMs` — soft threshold. Once exceeded the record is eligible
 *     for an opportunistic refresh: it will be refetched if there's room in
 *     the batch budget.
 *   - `expireAfterMs` — hard threshold. Past this we treat the record as no
 *     longer trustworthy and require a refresh before serving.
 *
 * Pure functions; the caller injects `now` so tests can pin time without
 * touching `Date.now`.
 */

import { z } from 'zod'

const isoTimestampSchema = z.string().datetime({ offset: true })

export const freshnessRecordSchema = z.object({
  dedupe_key: z.string().min(1),
  last_refreshed_at: isoTimestampSchema.nullable(),
  source: z.enum(['zillow', 'mock', 'manual']),
})

export type FreshnessRecord = z.infer<typeof freshnessRecordSchema>

export type Staleness = 'fresh' | 'stale' | 'expired'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export interface FreshnessTtl {
  staleAfterMs: number
  expireAfterMs: number
}

const ZILLOW_TTL: FreshnessTtl = {
  staleAfterMs: 12 * HOUR_MS,
  expireAfterMs: 7 * DAY_MS,
}

const MOCK_TTL: FreshnessTtl = {
  staleAfterMs: 1 * HOUR_MS,
  expireAfterMs: 6 * HOUR_MS,
}

const MANUAL_TTL: FreshnessTtl = {
  // Manual entries are operator-curated; we never auto-mark them stale,
  // but we do expire them eventually so they get re-checked.
  staleAfterMs: 30 * DAY_MS,
  expireAfterMs: 90 * DAY_MS,
}

export const DEFAULT_TTL_BY_SOURCE: Record<
  FreshnessRecord['source'],
  FreshnessTtl
> = {
  zillow: ZILLOW_TTL,
  mock: MOCK_TTL,
  manual: MANUAL_TTL,
}

export const ttlConfigSchema = z
  .object({
    staleAfterMs: z.number().int().positive(),
    expireAfterMs: z.number().int().positive(),
  })
  .refine((ttl) => ttl.expireAfterMs >= ttl.staleAfterMs, {
    message: 'expireAfterMs must be >= staleAfterMs',
  })

export interface FreshnessOptions {
  /** Override TTLs by source. Missing sources fall back to defaults. */
  ttlBySource?: Partial<Record<FreshnessRecord['source'], FreshnessTtl>>
  /** Injectable clock for deterministic tests. */
  now?: () => Date
}

function resolveTtl(
  source: FreshnessRecord['source'],
  options?: FreshnessOptions
): FreshnessTtl {
  const override = options?.ttlBySource?.[source]
  const ttl = override ?? DEFAULT_TTL_BY_SOURCE[source]
  ttlConfigSchema.parse(ttl)
  return ttl
}

function resolveNow(options?: FreshnessOptions): Date {
  return options?.now?.() ?? new Date()
}

/**
 * Classify a single record. Records that have never been refreshed are
 * always treated as `expired` — there's no signal saying they're current,
 * so the safest default is "refetch before serving".
 */
export function computeStaleness(
  record: FreshnessRecord,
  options?: FreshnessOptions
): Staleness {
  const ttl = resolveTtl(record.source, options)
  if (!record.last_refreshed_at) {
    return 'expired'
  }
  const now = resolveNow(options).getTime()
  const refreshedAt = new Date(record.last_refreshed_at).getTime()
  if (Number.isNaN(refreshedAt)) {
    return 'expired'
  }
  const ageMs = now - refreshedAt
  if (ageMs >= ttl.expireAfterMs) return 'expired'
  if (ageMs >= ttl.staleAfterMs) return 'stale'
  return 'fresh'
}

export function isStale(
  record: FreshnessRecord,
  options?: FreshnessOptions
): boolean {
  const status = computeStaleness(record, options)
  return status === 'stale' || status === 'expired'
}

export function isExpired(
  record: FreshnessRecord,
  options?: FreshnessOptions
): boolean {
  return computeStaleness(record, options) === 'expired'
}

/**
 * When this record next becomes stale (the soft TTL boundary). Returns the
 * current time when the record is already past that boundary, so callers
 * can use the value as "earliest refresh-at" without branching.
 */
export function nextRefreshAt(
  record: FreshnessRecord,
  options?: FreshnessOptions
): Date {
  const ttl = resolveTtl(record.source, options)
  const now = resolveNow(options)
  if (!record.last_refreshed_at) {
    return now
  }
  const refreshedAt = new Date(record.last_refreshed_at).getTime()
  if (Number.isNaN(refreshedAt)) return now
  const candidate = refreshedAt + ttl.staleAfterMs
  return new Date(Math.max(candidate, now.getTime()))
}

export interface RefreshBudget {
  /** Hard cap on number of records to refresh in this run. */
  maxRecords: number
  /** Optional cap on per-source records (for fairness across sources). */
  maxPerSource?: Partial<Record<FreshnessRecord['source'], number>>
}

export interface RefreshSelection<T extends FreshnessRecord> {
  toRefresh: T[]
  skipped: Array<{
    record: T
    reason: 'fresh' | 'budget_exhausted' | 'source_budget_exhausted'
  }>
}

/**
 * Pick the records that should be refreshed in the next run. Expired records
 * win over merely-stale records, and within each tier the oldest
 * `last_refreshed_at` goes first — we prioritize the longest-neglected
 * listings so freshness coverage drifts upward over time.
 */
export function selectRefreshTargets<T extends FreshnessRecord>(
  records: T[],
  budget: RefreshBudget,
  options?: FreshnessOptions
): RefreshSelection<T> {
  const toRefresh: T[] = []
  const skipped: RefreshSelection<T>['skipped'] = []
  const perSourceCount: Partial<Record<FreshnessRecord['source'], number>> = {}

  const ranked = [...records]
    .map((record) => ({ record, status: computeStaleness(record, options) }))
    .filter((entry) => entry.status !== 'fresh')
    .sort((a, b) => {
      // expired before stale
      if (a.status !== b.status) return a.status === 'expired' ? -1 : 1
      // oldest refresh first; nulls are oldest
      const aTime = a.record.last_refreshed_at
        ? new Date(a.record.last_refreshed_at).getTime()
        : 0
      const bTime = b.record.last_refreshed_at
        ? new Date(b.record.last_refreshed_at).getTime()
        : 0
      return aTime - bTime
    })

  for (const { record } of ranked) {
    if (toRefresh.length >= budget.maxRecords) {
      skipped.push({ record, reason: 'budget_exhausted' })
      continue
    }
    const perSourceCap = budget.maxPerSource?.[record.source]
    const used = perSourceCount[record.source] ?? 0
    if (perSourceCap !== undefined && used >= perSourceCap) {
      skipped.push({ record, reason: 'source_budget_exhausted' })
      continue
    }
    toRefresh.push(record)
    perSourceCount[record.source] = used + 1
  }

  for (const record of records) {
    const status = computeStaleness(record, options)
    if (status === 'fresh') {
      skipped.push({ record, reason: 'fresh' })
    }
  }

  return { toRefresh, skipped }
}
