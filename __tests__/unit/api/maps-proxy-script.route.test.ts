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
  const originalFetch = global.fetch

  beforeEach(() => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = 'test-maps-key'
  })

  afterEach(() => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = originalKey
    global.fetch = originalFetch
  })

  it('forwards a stable referrer origin to Google', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '/* maps bootstrap */',
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const request = new Request('https://homematch.pro/api/maps/proxy-script', {
      headers: {
        referer: 'https://homematch.pro/dashboard',
      },
    })

    const response = await GET(request)

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [scriptUrl, options] = fetchMock.mock.calls[0] as [
      string,
      { headers?: Record<string, string> },
    ]
    expect(scriptUrl).toContain('https://maps.googleapis.com/maps/api/js?')
    expect(scriptUrl).toContain('key=test-maps-key')
    expect(scriptUrl).toContain('libraries=places,marker')
    expect(options.headers?.referer).toBe('https://homematch.pro/')

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain(
      'application/javascript'
    )
    await expect(response.text()).resolves.toBe('/* maps bootstrap */')
  })
})
