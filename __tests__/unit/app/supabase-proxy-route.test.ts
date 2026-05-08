/** @jest-environment node */

import { NextRequest } from 'next/server'

const invokeGet = async (url = 'http://localhost/supabase/rest/v1/properties') => {
  const route = await import('@/app/supabase/[...path]/route')
  return route.GET(new NextRequest(url), {
    params: Promise.resolve({ path: ['rest', 'v1', 'properties'] }),
  })
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
    const fetchMock = jest.fn(async () =>
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
})
