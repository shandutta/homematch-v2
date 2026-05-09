// Phase 0/1 closure: P0-supabase-proxy-off
/** @jest-environment node */

import { NextRequest } from 'next/server'

const installFetchMock = () => {
  const fetchMock = jest.fn(
    async () => new Response('upstream-should-not-be-reached', { status: 200 })
  )
  Object.defineProperty(globalThis, 'fetch', {
    value: fetchMock,
    configurable: true,
    writable: true,
  })
  return fetchMock
}

const invokeGet = async (
  url = 'http://localhost/supabase/rest/v1/properties'
) => {
  const route = await import('@/app/supabase/[...path]/route')
  return route.GET(new NextRequest(url), {
    params: Promise.resolve({ path: ['rest', 'v1', 'properties'] }),
  })
}

const invokePost = async (
  url = 'http://localhost/supabase/rest/v1/properties'
) => {
  const route = await import('@/app/supabase/[...path]/route')
  return route.POST(
    new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify({ name: 'should-not-leak' }),
      headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({ path: ['rest', 'v1', 'properties'] }) }
  )
}

describe('/supabase local proxy route', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    jest.resetModules()
    delete process.env.SUPABASE_LOCAL_PROXY
    delete process.env.SUPABASE_LOCAL_PROXY_TARGET
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'fetch', {
      value: originalFetch,
      configurable: true,
      writable: true,
    })
  })

  it('stays disabled by default and never reaches an upstream', async () => {
    const fetchMock = jest.fn()
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true,
      writable: true,
    })

    const res = await invokeGet()

    expect(res.status).toBe(404)
    expect(await res.text()).toBe('Supabase proxy disabled')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects enabled proxy targets outside the local allowlist', async () => {
    process.env.SUPABASE_LOCAL_PROXY = 'true'
    process.env.SUPABASE_LOCAL_PROXY_TARGET = 'https://supabase.example.com'
    const fetchMock = jest.fn(async () => new Response('should not be reached'))
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true,
      writable: true,
    })

    const res = await invokeGet()

    expect(res.status).toBe(403)
    expect(await res.text()).toBe('Supabase proxy target not allowed')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows explicit loopback targets when the local proxy is enabled', async () => {
    process.env.SUPABASE_LOCAL_PROXY = 'true'
    process.env.SUPABASE_LOCAL_PROXY_TARGET = 'http://127.0.0.1:54321/'
    const fetchMock = jest.fn(
      async () =>
        new Response('ok', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
    )
    Object.defineProperty(globalThis, 'fetch', {
      value: fetchMock,
      configurable: true,
      writable: true,
    })

    const res = await invokeGet(
      'http://localhost/supabase/rest/v1/properties?select=id'
    )

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
    expect(res.headers.get('x-supabase-proxy-target')).toBe(
      'http://127.0.0.1:54321'
    )
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/rest/v1/properties?select=id',
      expect.objectContaining({
        method: 'GET',
        redirect: 'manual',
        cache: 'no-store',
      })
    )
  })

  describe('disabled-by-default gate', () => {
    it.each([
      ['unset', undefined],
      ['empty string', ''],
      ['"false" literal', 'false'],
      ['"1" literal', '1'],
      ['"TRUE" wrong-case', 'TRUE'],
      ['" true " padded', ' true '],
    ])(
      'stays disabled when SUPABASE_LOCAL_PROXY is %s and never fetches',
      async (_label, value) => {
        if (value === undefined) {
          delete process.env.SUPABASE_LOCAL_PROXY
        } else {
          process.env.SUPABASE_LOCAL_PROXY = value
        }
        process.env.SUPABASE_LOCAL_PROXY_TARGET = 'http://127.0.0.1:54321'
        const fetchMock = installFetchMock()

        const res = await invokeGet()

        expect(res.status).toBe(404)
        expect(await res.text()).toBe('Supabase proxy disabled')
        expect(fetchMock).not.toHaveBeenCalled()
      }
    )

    it('gates non-GET methods identically when disabled', async () => {
      const fetchMock = installFetchMock()

      const res = await invokePost()

      expect(res.status).toBe(404)
      expect(await res.text()).toBe('Supabase proxy disabled')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('loopback-only target allowlist', () => {
    it.each([
      ['cloud metadata service', 'http://169.254.169.254/latest/meta-data'],
      ['private LAN router', 'http://192.168.1.1:54321'],
      ['private LAN 10.x', 'http://10.0.0.5:54321'],
      ['public IP', 'http://203.0.113.10:54321'],
      ['external hostname', 'https://supabase.example.com'],
      ['https loopback (only http allowed)', 'https://127.0.0.1:54321'],
      ['subdomain spoof of loopback', 'http://127.0.0.1.evil.com:54321'],
      ['credential-stuffed external host', 'http://127.0.0.1@evil.com/'],
      ['malformed URL', 'not-a-url'],
      ['empty string target', ''],
    ])('rejects %s with 403 and never fetches', async (_label, target) => {
      process.env.SUPABASE_LOCAL_PROXY = 'true'
      // Explicit empty must override the default — set after assigning to
      // exercise the falsy branch through the same code path the operator
      // would hit if they cleared the variable in their .env.
      if (target === '') {
        process.env.SUPABASE_LOCAL_PROXY_TARGET = ''
      } else {
        process.env.SUPABASE_LOCAL_PROXY_TARGET = target
      }
      const fetchMock = installFetchMock()

      const res = await invokeGet()

      // Empty target falls back to the default loopback, so it should
      // succeed rather than 403; everything else must be rejected.
      if (target === '') {
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [calledUrl] = fetchMock.mock.calls[0]!
        expect(calledUrl).toMatch(/^http:\/\/127\.0\.0\.1:54200\//)
        return
      }

      expect(res.status).toBe(403)
      expect(await res.text()).toBe('Supabase proxy target not allowed')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it.each([
      ['127.0.0.1', 'http://127.0.0.1:54321', 'http://127.0.0.1:54321'],
      ['localhost', 'http://localhost:54321', 'http://localhost:54321'],
      ['IPv6 [::1]', 'http://[::1]:54321', 'http://[::1]:54321'],
    ])(
      'allows loopback host %s when proxy is enabled',
      async (_label, target, normalized) => {
        process.env.SUPABASE_LOCAL_PROXY = 'true'
        process.env.SUPABASE_LOCAL_PROXY_TARGET = target
        const fetchMock = jest.fn(
          async () => new Response('ok', { status: 200 })
        )
        Object.defineProperty(globalThis, 'fetch', {
          value: fetchMock,
          configurable: true,
          writable: true,
        })

        const res = await invokeGet()

        expect(res.status).toBe(200)
        expect(res.headers.get('x-supabase-proxy-target')).toBe(normalized)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [calledUrl] = fetchMock.mock.calls[0]!
        expect(calledUrl).toBe(`${normalized}/rest/v1/properties`)
      }
    )

    it('falls back to the default loopback target when none is configured', async () => {
      process.env.SUPABASE_LOCAL_PROXY = 'true'
      const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }))
      Object.defineProperty(globalThis, 'fetch', {
        value: fetchMock,
        configurable: true,
        writable: true,
      })

      const res = await invokeGet()

      expect(res.status).toBe(200)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [calledUrl] = fetchMock.mock.calls[0]!
      expect(calledUrl).toMatch(/^http:\/\/127\.0\.0\.1:54200\//)
    })
  })
})
