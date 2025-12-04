/** @jest-environment node */

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
  const range = jest.fn((from: number, to: number) => ({
    data: rows.slice(from, to + 1),
    error: null,
  }))
  const order = jest.fn(() => ({ order, range }))
  const select = jest.fn(() => ({ order }))
  const upsert = jest.fn(async () => ({ error: null }))
  const from = jest.fn(() => ({ select, order, range, upsert }))
  return { client: { from }, upsert }
}

describe('POST /api/admin/status-refresh', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(global as any).fetch = undefined
    jest.resetModules()
  })

  test('rejects missing or invalid secret', async () => {
    process.env.STATUS_REFRESH_CRON_SECRET = 'secret'
    process.env.RAPIDAPI_KEY = 'key'
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
    ;(global as any).fetch = fetchMock

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

    expect(stub.upsert).toHaveBeenCalledTimes(1)
    const payload = stub.upsert.mock.calls[0][0]
    const statusByZpid = Object.fromEntries(
      payload.map((row: any) => [row.zpid, row.listing_status])
    )
    const activeByZpid = Object.fromEntries(
      payload.map((row: any) => [row.zpid, row.is_active])
    )
    expect(statusByZpid).toEqual({ z1: 'sold', z2: 'removed' })
    expect(activeByZpid).toEqual({ z1: false, z2: false })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
