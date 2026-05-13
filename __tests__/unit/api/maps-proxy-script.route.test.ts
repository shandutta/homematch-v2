// Phase 0/1 closure: P0-maps-auth-hardening
import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals'
import { GET } from '@/app/api/maps/proxy-script/route'

describe('/api/maps/proxy-script', () => {
  type FetchFn = (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response>
  const originalKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  const originalMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalFetch = global.fetch

  const getHeaderValue = (headers: HeadersInit | undefined, key: string) => {
    if (!headers) return undefined
    if (headers instanceof Headers) {
      return headers.get(key) ?? undefined
    }
    if (Array.isArray(headers)) {
      const match = headers.find(
        ([entryKey]) => entryKey.toLowerCase() === key.toLowerCase()
      )
      return match?.[1]
    }
    return headers[key]
  }

  beforeEach(() => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = 'test-maps-key'
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
    // Q8 audit fix (2026-05-13): proxy now pins upstream Referer to
    // NEXT_PUBLIC_APP_URL instead of reflecting request headers.
    process.env.NEXT_PUBLIC_APP_URL = 'https://homematch.pro'
  })

  afterEach(() => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = originalKey
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = originalMapId
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    global.fetch = originalFetch
  })

  it('forwards a stable referrer origin to Google', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response('/* maps bootstrap */', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      })
    )
    global.fetch = fetchMock

    const request = new Request('https://homematch.pro/api/maps/proxy-script', {
      headers: {
        referer: 'https://homematch.pro/dashboard',
      },
    })

    const response = await GET(request)

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const call = fetchMock.mock.calls[0]
    const urlArg = call?.[0]
    const scriptUrl =
      typeof urlArg === 'string' ? urlArg : urlArg?.toString() || ''
    expect(scriptUrl).toContain('https://maps.googleapis.com/maps/api/js?')
    expect(scriptUrl).toContain('key=test-maps-key')
    expect(scriptUrl).toContain('libraries=places')
    expect(getHeaderValue(call?.[1]?.headers, 'referer')).toBe(
      'https://homematch.pro/'
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain(
      'application/javascript'
    )
    await expect(response.text()).resolves.toBe('/* maps bootstrap */')
  })

  it('rejects cross-origin requests with 403 (Q8 hot-link protection)', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response('/* maps bootstrap */', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      })
    )
    global.fetch = fetchMock

    const request = new Request('https://homematch.pro/api/maps/proxy-script', {
      headers: {
        referer: 'https://attacker.example/',
        origin: 'https://attacker.example',
      },
    })

    const response = await GET(request)

    expect(response.status).toBe(403)
    // No upstream fetch on rejection.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ships the env-pinned Referer upstream on legitimate same-origin requests (Q8)', async () => {
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response('/* maps bootstrap */', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      })
    )
    global.fetch = fetchMock

    const request = new Request('https://homematch.pro/api/maps/proxy-script', {
      headers: { referer: 'https://homematch.pro/properties/abc' },
    })

    await GET(request)

    const call = fetchMock.mock.calls[0]
    expect(getHeaderValue(call?.[1]?.headers, 'referer')).toBe(
      'https://homematch.pro/'
    )
  })

  it('serves nothing when no env-pinned origin is set', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response('/* maps bootstrap */', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      })
    )
    global.fetch = fetchMock

    const request = new Request('https://homematch.pro/api/maps/proxy-script', {
      headers: { referer: 'https://homematch.pro/dashboard' },
    })

    await GET(request)

    const call = fetchMock.mock.calls[0]
    // With no pinned referer, the proxy declines to send one upstream rather
    // than reflecting the client header.
    expect(getHeaderValue(call?.[1]?.headers, 'referer')).toBeUndefined()
  })

  it('includes the marker library when a map ID is configured', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = 'test-map-id'

    const fetchMock: jest.MockedFunction<FetchFn> = jest.fn()
    fetchMock.mockResolvedValue(
      new Response('/* maps bootstrap */', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      })
    )
    global.fetch = fetchMock

    const request = new Request('https://homematch.pro/api/maps/proxy-script', {
      headers: {
        referer: 'https://homematch.pro/dashboard',
      },
    })

    await GET(request)

    const urlArg = fetchMock.mock.calls[0]?.[0]
    const scriptUrl =
      typeof urlArg === 'string' ? urlArg : urlArg?.toString() || ''
    expect(scriptUrl).toContain('libraries=places,drawing,marker')
  })
})
