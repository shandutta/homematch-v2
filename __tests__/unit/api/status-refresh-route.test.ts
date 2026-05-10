// Phase 0/1 closure: P1-cache-policy-classification
/** @jest-environment node */

// Phase 0/1 closure: P1-cache-policy-classification
type Row = {
  id: string
  zpid: string
  address: string
  city: string
  state: string
  zip_code: string
  bedrooms: number
  bathrooms: number
  price: number
  listing_status: string
  is_active: boolean
}

function makeSupabaseStub(rows: Row[]) {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  }
  // Chaining methods return the same chain
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  // Terminal methods return data
  chain.range.mockImplementation((from: number, to: number) => ({
    data: rows.slice(from, to + 1),
    error: null,
  }))
  chain.update.mockReturnValue({
    in: jest.fn().mockReturnValue({ error: null }),
    eq: jest.fn().mockReturnValue({ error: null }),
  })
  chain.upsert.mockReturnValue({ error: null })

  const from = jest.fn().mockReturnValue(chain)
  return { client: { from }, update: chain.update, upsert: chain.upsert }
}

describe('POST /api/admin/status-refresh', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    Object.defineProperty(globalThis, 'fetch', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    jest.resetModules()
  })

  test('rejects missing or invalid secret', async () => {
    process.env.STATUS_REFRESH_CRON_SECRET = 'secret'
    process.env.RAPIDAPI_KEY = 'key'
    process.env.HOMEMATCH_ALLOW_PAID_RAPIDAPI = 'true'
    process.env.RAPIDAPI_HOST = 'us-housing-market-data1.p.rapidapi.com'

    const { POST } = await import('@/app/api/admin/status-refresh/route')

    const res = await POST(
      new Request('http://localhost/api/admin/status-refresh', {
        method: 'POST',
      })
    )
    expect(res.status).toBe(401)
  })

  test('marks sold and off-market listings and logs changes', async () => {
    const rows: Row[] = [
      {
        id: '1',
        zpid: 'z1',
        address: '123 A St',
        city: 'SF',
        state: 'CA',
        zip_code: '94101',
        bedrooms: 2,
        bathrooms: 1,
        price: 1000000,
        listing_status: 'active',
        is_active: true,
      },
      {
        id: '2',
        zpid: 'z2',
        address: '456 B St',
        city: 'SF',
        state: 'CA',
        zip_code: '94101',
        bedrooms: 3,
        bathrooms: 2,
        price: 1500000,
        listing_status: 'active',
        is_active: true,
      },
    ]
    const stub = makeSupabaseStub(rows)
    jest.doMock('@/lib/supabase/standalone', () => ({
      createStandaloneClient: () => stub.client,
    }))

    process.env.STATUS_REFRESH_CRON_SECRET = 'secret'
    process.env.RAPIDAPI_KEY = 'key'
    process.env.HOMEMATCH_ALLOW_PAID_RAPIDAPI = 'true'
    process.env.RAPIDAPI_HOST = 'us-housing-market-data1.p.rapidapi.com'

    const fetchMock = jest.fn(async (url: RequestInfo | URL) => {
      const href = url.toString()
      if (href.includes('zpid=z1')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({ homeStatus: 'sold', price: 2000000 }),
        }
      }
      if (href.includes('zpid=z2')) {
        return {
          status: 200,
          ok: true,
          json: async () => ({ homeStatus: 'off_market' }),
        }
      }
      return { status: 500, ok: false, json: async () => ({}) }
    })
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true,
      writable: true,
    })

    const { POST } = await import('@/app/api/admin/status-refresh/route')

    const res = await POST(
      new Request(
        'http://localhost/api/admin/status-refresh?cron_secret=secret',
        {
          method: 'POST',
        }
      )
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.changed).toBe(2)
    expect(body.soldChanges).toBe(1)
    expect(body.removedChanges).toBe(1)
    expect(body.changeSamples.length).toBeGreaterThanOrEqual(2)

    // Batched status updates: one call per (listing_status, is_active) group
    // z1 → ('sold', false) + price change, z2 → ('removed', false)
    expect(stub.update).toHaveBeenCalled()
    expect(stub.update.mock.calls.length).toBe(2) // 2 status groups
    expect(stub.upsert.mock.calls.length).toBe(1) // 1 batched price upsert (z1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
