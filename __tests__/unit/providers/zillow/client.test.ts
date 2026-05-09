/** @jest-environment node */

import {
  buildSearchUrl,
  fetchSearchPage,
  isStreetViewImageUrl,
  isZillowStaticImageUrl,
} from '@/lib/providers/zillow/client'

type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

// ── buildSearchUrl ───────────────────────────────────────────────────

describe('buildSearchUrl', () => {
  test('encodes location and base params', () => {
    const url = buildSearchUrl({
      location: 'San Francisco, CA',
      page: 1,
      pageSize: 50,
    })

    expect(url).toContain('propertyExtendedSearch')
    expect(url).toContain('location=San+Francisco%2C+CA')
    expect(url).toContain('page=1')
    expect(url).toContain('pageSize=50')
    expect(url).toContain('status_type=ForSale')
  })

  test('includes sort when provided', () => {
    const url = buildSearchUrl({
      location: 'Oakland, CA',
      page: 2,
      pageSize: 25,
      sort: 'Price_High_Low',
    })

    expect(url).toContain('sort=Price_High_Low')
  })

  test('includes minPrice and maxPrice when provided', () => {
    const url = buildSearchUrl({
      location: 'SF',
      page: 1,
      pageSize: 50,
      minPrice: 500000,
      maxPrice: 2000000,
    })

    expect(url).toContain('minPrice=500000')
    expect(url).toContain('maxPrice=2000000')
  })

  test('omits sort/price params when not provided', () => {
    const url = buildSearchUrl({
      location: 'SF',
      page: 1,
      pageSize: 50,
    })

    expect(url).not.toContain('sort=')
    expect(url).not.toContain('minPrice=')
    expect(url).not.toContain('maxPrice=')
  })

  test('uses custom host when provided', () => {
    const url = buildSearchUrl({
      location: 'SF',
      page: 1,
      pageSize: 50,
      host: 'custom-host.example.com',
    })

    expect(url).toContain('custom-host.example.com')
    expect(url).not.toContain('us-housing-market-data1')
  })

  test('encodes page as string', () => {
    const url = buildSearchUrl({
      location: 'SF',
      page: 3,
      pageSize: 25,
    })

    expect(url).toContain('page=3')
  })
})

// ── fetchSearchPage ──────────────────────────────────────────────────

describe('fetchSearchPage', () => {
  test('extracts results from props array', async () => {
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
          hasNextPage: false,
        }),
        { status: 200, statusText: 'OK' }
      )
    )

    const page = await fetchSearchPage({
      location: 'SF',
      page: 1,
      pageSize: 50,
      rapidApiKey: 'test-key',
      fetchImpl: fetchMock,
    })

    expect(page.items).toHaveLength(1)
    expect(page.items[0].zpid).toBe('1')
    expect(page.hasNextPage).toBe(false)
  })

  test('extracts results from results array', async () => {
    const sample = { zpid: '2', address: '456 B St' }

    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [sample],
          hasNextPage: true,
        }),
        { status: 200, statusText: 'OK' }
      )
    )

    const page = await fetchSearchPage({
      location: 'SF',
      page: 1,
      pageSize: 50,
      rapidApiKey: 'test-key',
      fetchImpl: fetchMock,
    })

    expect(page.items).toHaveLength(1)
    expect(page.hasNextPage).toBe(true)
  })

  test('extracts results from data.results nested path', async () => {
    const sample = { zpid: '3', address: '789 C St' }

    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { results: [sample] },
        }),
        { status: 200, statusText: 'OK' }
      )
    )

    const page = await fetchSearchPage({
      location: 'SF',
      page: 1,
      pageSize: 50,
      rapidApiKey: 'test-key',
      fetchImpl: fetchMock,
    })

    expect(page.items).toHaveLength(1)
  })

  test('detects hasNextPage from totalPages', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ zpid: '1' }],
          totalPages: 3,
        }),
        { status: 200, statusText: 'OK' }
      )
    )

    // page 1 of 3 => hasNextPage should be true
    const page = await fetchSearchPage({
      location: 'SF',
      page: 1,
      pageSize: 50,
      rapidApiKey: 'test-key',
      fetchImpl: fetchMock,
    })

    expect(page.hasNextPage).toBe(true)
  })

  test('detects no next page from totalPages when on last page', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ zpid: '1' }],
          totalPages: 2,
        }),
        { status: 200, statusText: 'OK' }
      )
    )

    // page 2 of 2 => hasNextPage should be false
    const page = await fetchSearchPage({
      location: 'SF',
      page: 2,
      pageSize: 50,
      rapidApiKey: 'test-key',
      fetchImpl: fetchMock,
    })

    expect(page.hasNextPage).toBe(false)
  })

  test('detects next page from totalCount', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ zpid: '1' }],
          totalCount: 100,
        }),
        { status: 200, statusText: 'OK' }
      )
    )

    // page 1, pageSize 50, totalCount 100 => hasNextPage should be true
    const page = await fetchSearchPage({
      location: 'SF',
      page: 1,
      pageSize: 50,
      rapidApiKey: 'test-key',
      fetchImpl: fetchMock,
    })

    expect(page.hasNextPage).toBe(true)
  })

  test('assumes next page when returnedCount >= pageSize', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            { zpid: '1' },
            { zpid: '2' },
            { zpid: '3' },
          ],
        }),
        { status: 200, statusText: 'OK' }
      )
    )

    // pageSize=3, returned=3 => hasNextPage falls through to `returnedCount >= pageSize`
    const page = await fetchSearchPage({
      location: 'SF',
      page: 1,
      pageSize: 3,
      rapidApiKey: 'test-key',
      fetchImpl: fetchMock,
    })

    expect(page.hasNextPage).toBe(true)
  })

  test('throws RATE_LIMIT on 429', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response('', { status: 429, statusText: 'Too Many Requests' })
    )

    await expect(
      fetchSearchPage({
        location: 'SF',
        page: 1,
        pageSize: 50,
        rapidApiKey: 'test-key',
        fetchImpl: fetchMock,
      })
    ).rejects.toThrow('RATE_LIMIT')
  })

  test('throws on non-ok response', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response('Server Error', { status: 500, statusText: 'Internal Server Error' })
    )

    await expect(
      fetchSearchPage({
        location: 'SF',
        page: 1,
        pageSize: 50,
        rapidApiKey: 'test-key',
        fetchImpl: fetchMock,
      })
    ).rejects.toThrow('HTTP 500')
  })

  test('sends correct RapidAPI headers', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ results: [], hasNextPage: false }),
        { status: 200, statusText: 'OK' }
      )
    )

    await fetchSearchPage({
      location: 'SF',
      page: 1,
      pageSize: 50,
      rapidApiKey: 'my-api-key',
      fetchImpl: fetchMock,
    })

    const callArgs = fetchMock.mock.calls[0]
    const init = callArgs[1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers['X-RapidAPI-Key']).toBe('my-api-key')
    expect(headers['X-RapidAPI-Host']).toBe('us-housing-market-data1.p.rapidapi.com')
  })
})

// ── Image URL detection ──────────────────────────────────────────────

describe('isStreetViewImageUrl', () => {
  test('detects Google Street View URLs', () => {
    expect(
      isStreetViewImageUrl(
        'https://maps.googleapis.com/maps/api/streetview?size=400x400&location=37.77,-122.42'
      )
    ).toBe(true)
  })

  test('rejects Zillow static URLs', () => {
    expect(
      isStreetViewImageUrl('https://photos.zillowstatic.com/p_a.jpg')
    ).toBe(false)
  })

  test('rejects empty string', () => {
    expect(isStreetViewImageUrl('')).toBe(false)
  })
})

describe('isZillowStaticImageUrl', () => {
  test('detects Zillow static image URLs', () => {
    expect(
      isZillowStaticImageUrl('https://photos.zillowstatic.com/fp/some-hash.jpg')
    ).toBe(true)
  })

  test('rejects Google Street View URLs', () => {
    expect(
      isZillowStaticImageUrl(
        'https://maps.googleapis.com/maps/api/streetview'
      )
    ).toBe(false)
  })

  test('rejects empty string', () => {
    expect(isZillowStaticImageUrl('')).toBe(false)
  })
})
