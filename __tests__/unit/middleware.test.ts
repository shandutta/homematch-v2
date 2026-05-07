/**
 * @jest-environment node
 */

import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { middleware, buildSupabaseSessionCookieOptions } from '../../middleware'

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((_url, _key, options) => {
    options.cookies.setAll([
      {
        name: 'sb-localhost-auth-token',
        value: 'mock-session',
        options: { path: '/', sameSite: 'lax' },
      },
    ])

    return {
      auth: {
        getUser: jest.fn(async () => ({
          data: { user: null },
          error: null,
        })),
      },
    }
  }),
}))

const makeRequest = (path: string) =>
  new NextRequest(new URL(path, 'http://localhost:3000'))

const mockedCreateServerClient = jest.mocked(createServerClient)

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

  it('marks refreshed Supabase auth cookies as httpOnly on the response', async () => {
    const response = await middleware(makeRequest('/login'))

    expect(mockedCreateServerClient).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)

    const cookies = response.cookies.getAll()
    expect(cookies).toHaveLength(1)
    expect(cookies[0].name).toBe('sb-localhost-auth-token')
    expect(cookies[0].httpOnly).toBe(true)
    expect(cookies[0].secure).toBe(true) // NODE_ENV=production in beforeEach
    expect(cookies[0].sameSite).toBe('lax')
    expect(cookies[0].path).toBe('/')
  })
})
