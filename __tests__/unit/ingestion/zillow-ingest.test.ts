/** @jest-environment node */

import {
  buildSearchUrl,
  fetchSearchPage,
} from '@/lib/providers/zillow/client'
import {
  mapSearchItemToProperty,
  computePropertyHash,
  computeSourceDataHash,
} from '@/lib/providers/zillow/transform'
import { ingestZillowLocations } from '@/lib/providers/zillow/ingest'
import type { SupabaseLike, ZillowSearchItem } from '@/lib/providers/zillow/types'

type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

// ── buildSearchUrl ───────────────────────────────────────────────────

describe('buildSearchUrl', () => {
  test('encodes location and params', () => {
    const url = buildSearchUrl({
      location: 'San Francisco, CA',
      page: 2,
      pageSize: 25,
      host: 'example.com',
    })
    expect(url).toContain('example.com/propertyExtendedSearch')
    expect(url).toContain('location=San+Francisco%2C+CA')
    expect(url).toContain('page=2')
    expect(url).toContain('pageSize=25')
    expect(url).toContain('status_type=ForSale')
  })
})

// ── mapSearchItemToProperty ──────────────────────────────────────────

describe('mapSearchItemToProperty', () => {
  test('maps core fields and falls back to imgSrc', () => {
    const result = mapSearchItemToProperty({
      zpid: 123,
      address: '123 Main St, San Francisco, CA 94105',
      price: 1000000,
      bedrooms: 2,
      bathrooms: 2,
      livingArea: 1100,
      propertyType: 'SINGLE_FAMILY',
      statusType: 'ForSale',
      imgSrc: 'http://example.com/a.jpg',
    })

    expect(result).not.toBeNull()
    expect(result!.zpid).toBe('123')
    expect(result!.property_type).toBe('single_family')
    expect(result!.listing_status).toBe('active')
    expect(result!.images).toEqual(['http://example.com/a.jpg'])
    expect(result!.city).toBe('San Francisco')
    expect(result!.state).toBe('CA')
    expect(result!.zip_code).toBe('94105')
    expect(result!.property_hash).toBeDefined()
    expect(result!.property_hash).toHaveLength(64)
    expect(result!.source_data_hash).toBeDefined()
    expect(result!.source_data_hash).toHaveLength(64)
  })
})

// ── fetchSearchPage ──────────────────────────────────────────────────

describe('fetchSearchPage', () => {
  test('extracts results from props/results/data.results', async () => {
    const sample = {
      zpid: '1',
      address: '123 A St',
      city: 'SF',
      state: 'CA',
      zipcode: '94105',
    }

    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          props: [sample],
          hasNextPage: true,
        }),
        { status: 200, statusText: 'OK' }
      )
    )

    const page = await fetchSearchPage({
      location: 'SF',
      page: 1,
      pageSize: 25,
      rapidApiKey: 'test',
      fetchImpl: fetchMock,
    })

    expect(page.items).toHaveLength(1)
    expect(page.hasNextPage).toBe(true)
  })
})

// ── ingestZillowLocations ────────────────────────────────────────────

describe('ingestZillowLocations', () => {
  test('transforms and upserts results', async () => {
    const item = {
      zpid: 999,
      address: '500 Howard St',
      city: 'San Francisco',
      state: 'CA',
      zipcode: '94105',
      price: 1230000,
      bedrooms: 2,
      bathrooms: 2,
      livingArea: 1200,
      propertyType: 'SINGLE_FAMILY',
      statusType: 'ForSale',
      imgSrc: 'http://example.com/a.jpg',
    }

    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [item],
          hasNextPage: false,
        }),
        { status: 200, statusText: 'OK' }
      )
    )

    const upsertMock = jest.fn().mockResolvedValue({ data: [], error: null })
    const rpcMock = jest.fn().mockResolvedValue({ data: null, error: null })
    const selectMock = jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
    })
    const supabaseMock: SupabaseLike = {
      from: jest.fn().mockReturnValue({
        select: selectMock,
        upsert: upsertMock,
      }),
      rpc: rpcMock,
    }

    const summary = await ingestZillowLocations({
      locations: ['San Francisco, CA'],
      rapidApiKey: 'test',
      supabase: supabaseMock,
      fetchImpl: fetchMock,
      delayMs: 0,
      maxPages: 1,
    })

    expect(fetchMock).toHaveBeenCalled()
    expect(supabaseMock.from).toHaveBeenCalledWith('properties')
    expect(upsertMock).toHaveBeenCalled()
    const payload = upsertMock.mock.calls[0][0][0]
    expect(payload.zpid).toBe('999')
    expect(payload.property_type).toBe('single_family')
    expect(payload.property_hash).toBeDefined()
    expect(payload.source_data_hash).toBeDefined()
    expect(payload.source_provider).toBe('zillow_rapidapi')
    expect(payload.last_verified_at).toBeDefined()
    expect(summary.totals.transformed).toBe(1)
    expect(summary.totals.inserted).toBe(1)
    expect(summary.totals.updated).toBe(0)
    expect(summary.totals.unchangedSkip).toBe(0)
    expect(summary.locations[0].errors).toEqual([])
    expect(rpcMock).toHaveBeenCalledWith('backfill_property_neighborhoods', {
      target_zpids: ['999'],
    })
  })
})

// ── Hashes ───────────────────────────────────────────────────────────

describe('property_hash and source_data_hash', () => {
  test('property_hash is computed and deterministic', () => {
    const h1 = computePropertyHash('999', '500 Howard St', 2, 2, 1200000)
    const h2 = computePropertyHash('999', '500 Howard St', 2, 2, 1200000)
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64)
  })

  test('source_data_hash is computed from raw payload', () => {
    const payload = { zpid: '999', price: 1230000 }
    const h = computeSourceDataHash(payload)
    expect(h).toHaveLength(64)
  })
})
