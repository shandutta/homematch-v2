/**
 * @jest-environment node
 */

import { createServerClient } from '@supabase/ssr'
import { readFileSync } from 'fs'
import { join } from 'path'
import { NextRequest } from 'next/server'
import {
  middleware,
  config,
  buildSupabaseSessionCookieOptions,
} from '../../middleware'
import {
  middleware as srcMiddleware,
  config as srcConfig,
} from '../../src/middleware'

const mockGetUser = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

const makeRequest = (path: string, init?: RequestInit) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), init)

const mockedCreateServerClient = jest.mocked(createServerClient)

const installDefaultSupabaseMiddlewareMock = () => {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: null,
  })

  mockedCreateServerClient.mockImplementation((_url, _key, options) => {
    options.cookies.setAll([
      {
        name: 'sb-localhost-auth-token',
        value: 'mock-session',
        options: { path: '/', sameSite: 'lax' },
      },
    ])

    return {
      auth: {
        getUser: mockGetUser,
      },
    } as ReturnType<typeof createServerClient>
  })
}

beforeEach(() => {
  installDefaultSupabaseMiddlewareMock()
})

describe('middleware auth configuration guard', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('redirects protected pages to login when Supabase public env is missing', async () => {
    const response = await middleware(makeRequest('/dashboard?tab=liked'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirectTo=%2Fdashboard%3Ftab%3Dliked'
    )
  })

  it('lets public pages render when Supabase public env is missing', async () => {
    const response = await middleware(makeRequest('/login'))

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe(
      'same-origin'
    )
    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe(
      'same-origin'
    )
  })

  it('lets API handlers own missing-env errors instead of crashing middleware', async () => {
    const response = await middleware(makeRequest('/api/couples/stats'))

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })
})

describe('middleware API and anonymous public-page fast paths', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NODE_ENV: 'production',
    }
    mockedCreateServerClient.mockClear()
    mockGetUser.mockClear()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('lets API handlers own auth without creating a Supabase middleware client', async () => {
    const response = await middleware(
      makeRequest('/api/foo', {
        headers: {
          cookie: 'sb-localhost-auth-token=mock-session',
        },
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe(
      'same-origin'
    )
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('lets anonymous public marketing pages render without creating a Supabase middleware client', async () => {
    const response = await middleware(makeRequest('/about'))

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe(
      'same-origin'
    )
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('redirects anonymous protected pages without creating a Supabase middleware client', async () => {
    const response = await middleware(makeRequest('/dashboard?tab=liked'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirectTo=%2Fdashboard%3Ftab%3Dliked'
    )
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('lets anonymous auth pages render without creating a Supabase middleware client', async () => {
    const response = await middleware(makeRequest('/login'))

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('still redirects authenticated auth pages through Supabase auth', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const response = await middleware(
      makeRequest('/login', {
        headers: {
          cookie:
            'sb-localhost-example-supabase-co-anon-key-auth-token=mock-session',
        },
      })
    )

    expect(mockedCreateServerClient).toHaveBeenCalledTimes(1)
    expect(mockGetUser).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/dashboard'
    )
  })

  it('still redirects protected pages through Supabase auth when no user is present', async () => {
    const response = await middleware(
      makeRequest('/dashboard?tab=liked', {
        headers: {
          cookie:
            'sb-localhost-example-supabase-co-anon-key-auth-token=mock-session',
        },
      })
    )

    expect(mockedCreateServerClient).toHaveBeenCalledTimes(1)
    expect(mockGetUser).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirectTo=%2Fdashboard%3Ftab%3Dliked'
    )
  })
})

describe('Next src-directory middleware entrypoint', () => {
  it('exposes the protected-route guard at src/middleware.ts so Next intercepts src/app routes before rendering', async () => {
    expect(srcConfig).toBe(config)

    const response = await srcMiddleware(makeRequest('/couples'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirectTo=%2Fcouples'
    )
    expect(mockedCreateServerClient).not.toHaveBeenCalled()
  })
})

describe('middleware matcher exclusions', () => {
  const matcher = config.matcher[0]

  it('skips Next.js data, static assets, and metadata files that do not need auth middleware', () => {
    expect(matcher).toContain('_next/data')
    expect(matcher).toContain('.*\\.(?:')
    expect(matcher).toContain('js')
    expect(matcher).toContain('css')
    expect(matcher).toContain('json')
    expect(matcher).toContain('xml')
    expect(matcher).toContain('txt')
    expect(matcher).toContain('woff2')
  })
})

describe('middleware Supabase auth timeout cleanup', () => {
  it('uses AbortController-backed Supabase fetch timeouts instead of orphaning Promise.race work', () => {
    const source = readFileSync(join(process.cwd(), 'middleware.ts'), 'utf8')

    expect(source).not.toContain('Promise.race')
    expect(source).toContain('AbortController')
    expect(source).toContain('createSupabaseTimeoutFetch')
    expect(source).toContain(
      'createSupabaseTimeoutFetch(supabaseTimeoutController.signal)'
    )
  })
})

describe('middleware Supabase session cookies', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NODE_ENV: 'production',
    }
    mockedCreateServerClient.mockClear()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('builds refreshed Supabase auth cookies as httpOnly', () => {
    expect(
      buildSupabaseSessionCookieOptions({ path: '/', sameSite: 'lax' })
    ).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    })
  })

  it('marks refreshed Supabase auth cookies as httpOnly via shared options helper', async () => {
    const response = await middleware(
      makeRequest('/login', {
        headers: {
          cookie:
            'sb-localhost-example-supabase-co-anon-key-auth-token=mock-session',
        },
      })
    )

    expect(mockedCreateServerClient).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
  })
})
