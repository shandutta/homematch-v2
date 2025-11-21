/** @jest-environment node */

import {
  buildSearchUrl,
  fetchZillowSearchPage,
  ingestZillowLocations,
  mapSearchItemToRaw,
} from '@/lib/ingestion/zillow'

describe('zillow ingestion helpers', () => {
  test('buildSearchUrl encodes location and params', () => {
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

  test('mapSearchItemToRaw maps core fields and falls back to imgSrc', () => {
    const raw = mapSearchItemToRaw({
      zpid: 123,
      streetAddress: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipcode: 94105,
      price: 1000000,
      bedrooms: 2,
      bathrooms: 2,
      livingArea: 1100,
      propertyType: 'SINGLE_FAMILY',
      statusType: 'ForSale',
      imgSrc: 'http://example.com/a.jpg',
    })

    expect(raw).not.toBeNull()
    expect(raw?.zpid).toBe('123')
    expect(raw?.property_type).toBe('single_family')
    expect(raw?.listing_status).toBe('active')
    expect(raw?.images).toEqual(['http://example.com/a.jpg'])
  })
})

describe('fetchZillowSearchPage', () => {
  test('extracts results from props/results/data.results', async () => {
    const sample = {
      zpid: '1',
      address: '123 A St',
      city: 'SF',
      state: 'CA',
      zipcode: '94105',
    }

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        props: [sample],
        hasNextPage: true,
      }),
    })

    const page = await fetchZillowSearchPage({
      location: 'SF',
      page: 1,
      rapidApiKey: 'test',
      fetchImpl: fetchMock as any,
    })

    expect(page.items).toHaveLength(1)
    expect(page.hasNextPage).toBe(true)
  })
})

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

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        results: [item],
        hasNextPage: false,
      }),
    })

    const upsertMock = jest.fn().mockResolvedValue({ data: [], error: null })
    const supabaseMock = {
      from: jest.fn().mockReturnValue({
        upsert: upsertMock,
      }),
    }

    const summary = await ingestZillowLocations({
      locations: ['San Francisco, CA'],
      rapidApiKey: 'test',
      supabase: supabaseMock as any,
      fetchImpl: fetchMock as any,
      delayMs: 0,
      maxPages: 1,
    })

    expect(fetchMock).toHaveBeenCalled()
    expect(supabaseMock.from).toHaveBeenCalledWith('properties')
    expect(upsertMock).toHaveBeenCalled()
    const payload = upsertMock.mock.calls[0][0][0]
    expect(payload.zpid).toBe('999')
    expect(payload.property_type).toBe('single_family')
    expect(summary.totals.transformed).toBe(1)
    expect(summary.totals.insertedOrUpdated).toBe(1)
    expect(summary.locations[0].errors).toEqual([])
  })
})
