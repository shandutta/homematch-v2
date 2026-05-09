/** @jest-environment node */

import {
  enrichProperties,
  discoverLocations,
} from '@/lib/providers/zillow/ingest'
import type { SupabaseLike, ZillowSearchItem } from '@/lib/providers/zillow/types'

type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

// ── Helpers ──────────────────────────────────────────────────────────

function makeSupabaseMock(overrides?: {
  selectData?: unknown[] | null
  selectError?: { message: string } | null
  upsertError?: { message: string } | null
  rpcError?: { message: string } | null
}): SupabaseLike {
  const upsertMock = jest.fn().mockResolvedValue({
    data: [],
    error: overrides?.upsertError ?? null,
  })

  const inMock = jest.fn().mockResolvedValue({
    data: overrides?.selectData ?? [],
    error: overrides?.selectError ?? null,
  })

  const selectMock = jest.fn().mockReturnValue({ in: inMock })
  const fromMock = jest.fn().mockReturnValue({
    select: selectMock,
    upsert: upsertMock,
  })

  const rpcMock = jest.fn().mockResolvedValue({
    data: null,
    error: overrides?.rpcError ?? null,
  })

  return {
    from: fromMock,
    rpc: rpcMock,
  }
}

function makeZillowItem(overrides?: Partial<ZillowSearchItem>): ZillowSearchItem {
  return {
    zpid: '12345',
    address: '500 Howard St, San Francisco, CA 94105',
    price: 1200000,
    bedrooms: 3,
    bathrooms: 2,
    livingArea: 1500,
    propertyType: 'SINGLE_FAMILY',
    statusType: 'ForSale',
    imgSrc: 'http://example.com/img.jpg',
    ...overrides,
  }
}

function makeFetchMock(
  items: ZillowSearchItem[],
  hasNextPage = false
): jest.MockedFunction<FetchFn> {
  const fn: jest.MockedFunction<FetchFn> = jest.fn()
  fn.mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ results: items, hasNextPage }),
        { status: 200, statusText: 'OK' }
      )
    )
  )
  return fn
}

// ── enrichProperties ─────────────────────────────────────────────────

describe('enrichProperties', () => {
  test('transforms and upserts new properties', async () => {
    const supabase = makeSupabaseMock()
    const items = [makeZillowItem()]

    const summary = await enrichProperties(
      'San Francisco, CA',
      items,
      supabase,
      false
    )

    expect(summary.attempted).toBe(1)
    expect(summary.transformed).toBe(1)
    expect(summary.inserted).toBe(1)
    expect(summary.updated).toBe(0)
    expect(summary.unchangedSkip).toBe(0)
    expect(summary.skipped).toBe(0)
    expect(summary.errors).toEqual([])
  })

  test('skips items with unparseable address', async () => {
    const supabase = makeSupabaseMock()
    const items: ZillowSearchItem[] = [
      { zpid: '12345', address: 'NoCityNoState' },
    ]

    const summary = await enrichProperties(
      'SF',
      items,
      supabase,
      false
    )

    expect(summary.attempted).toBe(1)
    expect(summary.transformed).toBe(0)
    expect(summary.skipped).toBe(1)
    expect(summary.inserted).toBe(0)
  })

  test('detects unchanged properties (same source_data_hash)', async () => {
    // First, insert a property to get its source_data_hash
    const supabase1 = makeSupabaseMock()
    const items = [makeZillowItem()]
    const summary1 = await enrichProperties('SF', items, supabase1)
    expect(summary1.inserted).toBe(1)

    // Re-run with same data — should be unchanged
    const supabase2 = makeSupabaseMock({
      selectData: [
        {
          zpid: '12345',
          source_data_hash: computeHashFromItem(makeZillowItem()),
        },
      ],
    })

    const summary2 = await enrichProperties('SF', items, supabase2)
    expect(summary2.unchangedSkip).toBe(1)
    expect(summary2.inserted).toBe(0)
    expect(summary2.updated).toBe(0)
  })

  test('detects changed properties (different source_data_hash)', async () => {
    const supabase = makeSupabaseMock({
      selectData: [
        {
          zpid: '12345',
          source_data_hash: '0000000000000000000000000000000000000000000000000000000000000000', // different hash
        },
      ],
    })

    const items = [makeZillowItem()]
    const summary = await enrichProperties('SF', items, supabase)

    expect(summary.updated).toBe(1)
    expect(summary.inserted).toBe(0)
    expect(summary.unchangedSkip).toBe(0)
  })

  test('handles empty items list', async () => {
    const supabase = makeSupabaseMock()
    const summary = await enrichProperties('SF', [], supabase)

    expect(summary.attempted).toBe(0)
    expect(summary.transformed).toBe(0)
  })

  test('handles upsert error', async () => {
    const supabase = makeSupabaseMock({
      upsertError: { message: 'DB error' },
    })

    const items = [makeZillowItem()]
    const summary = await enrichProperties('SF', items, supabase)

    expect(summary.errors.length).toBeGreaterThan(0)
    expect(summary.inserted).toBe(0)
    expect(summary.updated).toBe(0)
  })

  test('handles hash lookup error gracefully', async () => {
    const supabase = makeSupabaseMock({
      selectError: { message: 'Connection refused' },
    })

    const items = [makeZillowItem()]
    const summary = await enrichProperties('SF', items, supabase)

    // Falls back to treating all as new (no skip possible without hash lookup)
    expect(summary.inserted).toBe(1)
  })

  test('backfills neighborhoods after upsert', async () => {
    const supabase = makeSupabaseMock()
    const items = [makeZillowItem()]

    await enrichProperties('SF', items, supabase)

    expect(supabase.rpc).toHaveBeenCalledWith(
      'backfill_property_neighborhoods',
      { target_zpids: ['12345'] }
    )
  })

  test('records neighborhood backfill error without failing', async () => {
    const supabase = makeSupabaseMock({
      rpcError: { message: 'RPC error' },
    })

    const items = [makeZillowItem()]
    const summary = await enrichProperties('SF', items, supabase)

    expect(summary.inserted).toBe(1)
    expect(summary.errors.length).toBeGreaterThan(0)
    expect(summary.errors[0]).toContain('Neighborhood backfill failed')
  })

  test('tracks inserted/updated/unchanged correctly for mixed batch', async () => {
    // 3 items: 1 new (no hash in DB), 1 changed (different hash), 1 unchanged
    const item1 = makeZillowItem({ zpid: '111' })
    const item2 = makeZillowItem({ zpid: '222', price: 999000 })
    const item3 = makeZillowItem({ zpid: '333' })

    // Pre-populate hashes for 222 (different) and 333 (same)
    const supabase = makeSupabaseMock({
      selectData: [
        { zpid: '222', source_data_hash: 'different-hash-64chars000000000000000000000000000000000000000000' },
        { zpid: '333', source_data_hash: computeHashFromItem(item3) },
      ],
    })

    const summary = await enrichProperties('SF', [item1, item2, item3], supabase)

    expect(summary.inserted).toBe(1) // 111 — new
    expect(summary.updated).toBe(1)  // 222 — changed
    expect(summary.unchangedSkip).toBe(1) // 333 — unchanged
  })
})

// ── discoverLocations ────────────────────────────────────────────────

describe('discoverLocations', () => {
  test('fetches search results for each location', async () => {
    const fetchMock = makeFetchMock([makeZillowItem()], false)

    const results = await discoverLocations({
      locations: ['San Francisco, CA', 'Oakland, CA'],
      rapidApiKey: 'test-key',
      supabase: undefined as unknown as SupabaseLike,
      fetchImpl: fetchMock,
      delayMs: 0,
      maxPages: 1,
    })

    expect(results).toHaveLength(2)
    expect(results[0].location).toBe('San Francisco, CA')
    expect(results[0].items).toHaveLength(1)
    expect(results[1].location).toBe('Oakland, CA')
    expect(results[1].items).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('dryRun limits to 1 page per location', async () => {
    const fetchMock = makeFetchMock(
      [makeZillowItem(), makeZillowItem()],
      true // hasNextPage=true, but dryRun stops after 1 page
    )

    const results = await discoverLocations({
      locations: ['SF'],
      rapidApiKey: 'test-key',
      supabase: undefined as unknown as SupabaseLike,
      fetchImpl: fetchMock,
      delayMs: 0,
      maxPages: 10,
      dryRun: true,
    })

    expect(results).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1) // Only 1 page in dryRun
  })

  test('handles rate limit with retry', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    // First call: rate limit
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      // Second call: success
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ results: [makeZillowItem()], hasNextPage: false }),
          { status: 200 }
        )
      )

    const results = await discoverLocations({
      locations: ['SF'],
      rapidApiKey: 'test-key',
      supabase: undefined as unknown as SupabaseLike,
      fetchImpl: fetchMock,
      delayMs: 0,
      maxPages: 1,
    })

    expect(results).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2) // 1 rate limit + 1 success
  })

  test('handles fetch error gracefully', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockRejectedValue(new Error('Network error'))

    const results = await discoverLocations({
      locations: ['SF'],
      rapidApiKey: 'test-key',
      supabase: undefined as unknown as SupabaseLike,
      fetchImpl: fetchMock,
      delayMs: 0,
      maxPages: 1,
    })

    expect(results).toHaveLength(1)
    expect(results[0].items).toEqual([])
  })
})

// ── Helper: compute source_data_hash to match transform.ts output ────

import crypto from 'node:crypto'

function computeHashFromItem(item: ZillowSearchItem): string {
  const canonical = JSON.stringify(item, Object.keys(item).sort())
  return crypto.createHash('sha256').update(canonical).digest('hex')
}
