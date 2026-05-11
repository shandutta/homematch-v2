/**
 * @jest-environment node
 */
// Phase 0/1 closure: P1-cache-policy-classification

// Phase 0/1 closure: P1-cache-policy-classification
import { describe, it, expect } from '@jest/globals'

import {
  DEFAULT_TTL_BY_SOURCE,
  computeStaleness,
  freshnessRecordSchema,
  isExpired,
  isStale,
  nextRefreshAt,
  selectRefreshTargets,
  ttlConfigSchema,
  type FreshnessRecord,
} from '@/lib/ingest/freshness'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const NOW = new Date('2026-05-09T12:00:00.000Z')
const fixedClock = () => NOW

const recordRefreshedAt = (
  iso: string | null,
  source: FreshnessRecord['source'] = 'zillow',
  dedupe_key = 'zillow:zpid:1001'
): FreshnessRecord => ({
  dedupe_key,
  last_refreshed_at: iso,
  source,
})

describe('freshnessRecordSchema', () => {
  it('parses null last_refreshed_at', () => {
    const result = freshnessRecordSchema.parse({
      dedupe_key: 'zillow:zpid:1',
      last_refreshed_at: null,
      source: 'zillow',
    })
    expect(result.last_refreshed_at).toBeNull()
  })

  it('rejects non-iso last_refreshed_at', () => {
    const result = freshnessRecordSchema.safeParse({
      dedupe_key: 'zillow:zpid:1',
      last_refreshed_at: 'yesterday',
      source: 'zillow',
    })
    expect(result.success).toBe(false)
  })
})

describe('ttlConfigSchema', () => {
  it('rejects when expireAfter < staleAfter', () => {
    expect(
      ttlConfigSchema.safeParse({
        staleAfterMs: 10_000,
        expireAfterMs: 5_000,
      }).success
    ).toBe(false)
  })

  it('accepts equal stale and expire values', () => {
    expect(
      ttlConfigSchema.safeParse({
        staleAfterMs: 10_000,
        expireAfterMs: 10_000,
      }).success
    ).toBe(true)
  })
})

describe('computeStaleness', () => {
  it('treats never-refreshed records as expired', () => {
    expect(computeStaleness(recordRefreshedAt(null), { now: fixedClock })).toBe(
      'expired'
    )
  })

  it('returns fresh when within stale TTL', () => {
    const oneHourAgo = new Date(NOW.getTime() - 1 * HOUR_MS).toISOString()
    expect(
      computeStaleness(recordRefreshedAt(oneHourAgo), { now: fixedClock })
    ).toBe('fresh')
  })

  it('returns stale when past stale TTL but within expire TTL', () => {
    const aDayAgo = new Date(NOW.getTime() - 1 * DAY_MS).toISOString()
    expect(
      computeStaleness(recordRefreshedAt(aDayAgo), { now: fixedClock })
    ).toBe('stale')
  })

  it('returns expired when past expire TTL', () => {
    const tenDaysAgo = new Date(NOW.getTime() - 10 * DAY_MS).toISOString()
    expect(
      computeStaleness(recordRefreshedAt(tenDaysAgo), { now: fixedClock })
    ).toBe('expired')
  })

  it('honors per-source overrides', () => {
    const tenMinutesAgo = new Date(NOW.getTime() - 10 * 60_000).toISOString()
    const result = computeStaleness(recordRefreshedAt(tenMinutesAgo), {
      now: fixedClock,
      ttlBySource: {
        zillow: { staleAfterMs: 60_000, expireAfterMs: 120_000 },
      },
    })
    expect(result).toBe('expired')
  })

  it('manual source uses long TTL by default', () => {
    const tenDaysAgo = new Date(NOW.getTime() - 10 * DAY_MS).toISOString()
    expect(
      computeStaleness(recordRefreshedAt(tenDaysAgo, 'manual'), {
        now: fixedClock,
      })
    ).toBe('fresh')
  })

  it('treats malformed timestamps as expired', () => {
    expect(
      computeStaleness(
        // intentional bad timestamp; bypass schema for this case
        { dedupe_key: 'k', last_refreshed_at: 'not-a-date', source: 'zillow' },
        { now: fixedClock }
      )
    ).toBe('expired')
  })
})

describe('isStale and isExpired', () => {
  it('isStale is true for stale and expired', () => {
    const aDayAgo = new Date(NOW.getTime() - 1 * DAY_MS).toISOString()
    const tenDaysAgo = new Date(NOW.getTime() - 10 * DAY_MS).toISOString()
    expect(isStale(recordRefreshedAt(aDayAgo), { now: fixedClock })).toBe(true)
    expect(isStale(recordRefreshedAt(tenDaysAgo), { now: fixedClock })).toBe(
      true
    )
  })

  it('isStale is false for fresh', () => {
    const oneHourAgo = new Date(NOW.getTime() - 1 * HOUR_MS).toISOString()
    expect(isStale(recordRefreshedAt(oneHourAgo), { now: fixedClock })).toBe(
      false
    )
  })

  it('isExpired only true for expired', () => {
    const aDayAgo = new Date(NOW.getTime() - 1 * DAY_MS).toISOString()
    const tenDaysAgo = new Date(NOW.getTime() - 10 * DAY_MS).toISOString()
    expect(isExpired(recordRefreshedAt(aDayAgo), { now: fixedClock })).toBe(
      false
    )
    expect(isExpired(recordRefreshedAt(tenDaysAgo), { now: fixedClock })).toBe(
      true
    )
  })
})

describe('nextRefreshAt', () => {
  it('returns now when never refreshed', () => {
    expect(nextRefreshAt(recordRefreshedAt(null), { now: fixedClock })).toEqual(
      NOW
    )
  })

  it('returns refresh time + stale TTL for fresh records', () => {
    const oneHourAgo = new Date(NOW.getTime() - 1 * HOUR_MS).toISOString()
    const expected = new Date(
      new Date(oneHourAgo).getTime() + DEFAULT_TTL_BY_SOURCE.zillow.staleAfterMs
    )
    expect(
      nextRefreshAt(recordRefreshedAt(oneHourAgo), { now: fixedClock })
    ).toEqual(expected)
  })

  it('clamps to now when already past stale boundary', () => {
    const aDayAgo = new Date(NOW.getTime() - 1 * DAY_MS).toISOString()
    expect(
      nextRefreshAt(recordRefreshedAt(aDayAgo), { now: fixedClock })
    ).toEqual(NOW)
  })
})

describe('selectRefreshTargets', () => {
  const veryOld = new Date(NOW.getTime() - 30 * DAY_MS).toISOString() // expired
  const olderExpired = new Date(NOW.getTime() - 60 * DAY_MS).toISOString()
  const stale = new Date(NOW.getTime() - 1 * DAY_MS).toISOString()
  const fresh = new Date(NOW.getTime() - 1 * HOUR_MS).toISOString()

  const make = (
    key: string,
    refreshedAt: string | null,
    source: FreshnessRecord['source'] = 'zillow'
  ): FreshnessRecord => ({
    dedupe_key: key,
    last_refreshed_at: refreshedAt,
    source,
  })

  it('skips fresh records', () => {
    const records = [make('a', fresh)]
    const result = selectRefreshTargets(
      records,
      { maxRecords: 5 },
      { now: fixedClock }
    )
    expect(result.toRefresh).toHaveLength(0)
    expect(result.skipped).toEqual([{ record: records[0], reason: 'fresh' }])
  })

  it('prefers expired over stale and oldest first', () => {
    const records = [
      make('stale-1', stale),
      make('expired-newer', veryOld),
      make('expired-older', olderExpired),
    ]
    const result = selectRefreshTargets(
      records,
      { maxRecords: 10 },
      { now: fixedClock }
    )
    expect(result.toRefresh.map((r) => r.dedupe_key)).toEqual([
      'expired-older',
      'expired-newer',
      'stale-1',
    ])
  })

  it('null last_refreshed_at sorts before any timestamped expired record', () => {
    const records = [make('seen-once', olderExpired), make('never-seen', null)]
    const result = selectRefreshTargets(
      records,
      { maxRecords: 10 },
      { now: fixedClock }
    )
    expect(result.toRefresh[0].dedupe_key).toBe('never-seen')
  })

  it('respects maxRecords budget', () => {
    const records = [
      make('a', olderExpired),
      make('b', veryOld),
      make('c', stale),
    ]
    const result = selectRefreshTargets(
      records,
      { maxRecords: 1 },
      { now: fixedClock }
    )
    expect(result.toRefresh).toHaveLength(1)
    expect(result.toRefresh[0].dedupe_key).toBe('a')
    const reasons = result.skipped.map((s) => s.reason).sort()
    expect(reasons).toEqual(['budget_exhausted', 'budget_exhausted'])
  })

  it('respects per-source budgets', () => {
    const records = [
      make('z1', olderExpired, 'zillow'),
      make('z2', veryOld, 'zillow'),
      make('m1', olderExpired, 'mock'),
    ]
    const result = selectRefreshTargets(
      records,
      { maxRecords: 5, maxPerSource: { zillow: 1 } },
      { now: fixedClock }
    )
    expect(result.toRefresh).toHaveLength(2)
    const refreshedKeys = result.toRefresh.map((r) => r.dedupe_key).sort()
    expect(refreshedKeys).toContain('m1')
    const zillowSkip = result.skipped.find(
      (s) => s.reason === 'source_budget_exhausted'
    )
    expect(zillowSkip).toBeDefined()
  })

  it('returns nothing when all records are fresh', () => {
    // mock source has a 1-hour stale TTL, so "1 hour ago" sits exactly on
    // the boundary and counts as stale. Use a 5-minute-old mock record.
    const veryFreshMock = new Date(NOW.getTime() - 5 * 60_000).toISOString()
    const records = [make('a', fresh), make('b', veryFreshMock, 'mock')]
    const result = selectRefreshTargets(
      records,
      { maxRecords: 10 },
      { now: fixedClock }
    )
    expect(result.toRefresh).toHaveLength(0)
    expect(result.skipped).toHaveLength(2)
    expect(result.skipped.every((s) => s.reason === 'fresh')).toBe(true)
  })
})
