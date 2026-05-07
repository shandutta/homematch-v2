/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import { middleware } from '../../middleware'

const makeRequest = (path: string) =>
  new NextRequest(new URL(path, 'http://localhost:3000'))

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
  })

  it('lets API handlers own missing-env errors instead of crashing middleware', async () => {
    const response = await middleware(makeRequest('/api/couples/stats'))

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })
})
