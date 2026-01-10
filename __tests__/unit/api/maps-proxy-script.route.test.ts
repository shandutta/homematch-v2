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
  const originalKey = process.env.GOOGLE_MAPS_SERVER_API_KEY
  const originalMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
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
  })

  afterEach(() => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = originalKey
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = originalMapId
    global.fetch = originalFetch
  })

  it('forwards a stable referrer origin to Google', async () => {
    const fetchMock: jest.Mock<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    > = jest.fn()
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

  it('uses the origin header when referer is missing', async () => {
    const fetchMock: jest.Mock<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    > = jest.fn()
    fetchMock.mockResolvedValue(
      new Response('/* maps bootstrap */', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      })
    )
    global.fetch = fetchMock

    const request = new Request('https://homematch.pro/api/maps/proxy-script', {
      headers: {
        origin: 'https://homematch.pro',
      },
    })

    const response = await GET(request)

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const call = fetchMock.mock.calls[0]
    expect(getHeaderValue(call?.[1]?.headers, 'referer')).toBe(
      'https://homematch.pro/'
    )
    expect(response.status).toBe(200)
  })

  it('falls back to the request url when referrer headers are invalid', async () => {
    const fetchMock: jest.Mock<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    > = jest.fn()
    fetchMock.mockResolvedValue(
      new Response('/* maps bootstrap */', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      })
    )
    global.fetch = fetchMock

    const request = new Request('https://homematch.pro/api/maps/proxy-script', {
      headers: {
        referer: 'not-a-url',
        origin: 'also-not-a-url',
      },
    })

    await GET(request)

    const call = fetchMock.mock.calls[0]
    expect(getHeaderValue(call?.[1]?.headers, 'referer')).toBe(
      'https://homematch.pro/'
    )
  })

  it('includes the marker library when a map ID is configured', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID = 'test-map-id'

    const fetchMock: jest.Mock<
      Promise<Response>,
      [RequestInfo | URL, RequestInit?]
    > = jest.fn()
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
