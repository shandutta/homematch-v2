/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'
import {
  checkRateLimit,
  rateLimit,
  resetRateLimiters,
} from '@/lib/middleware/rateLimiter'

const makeRequest = (headers?: Record<string, string>) =>
  new NextRequest(new URL('/api/test', 'http://localhost:3000'), { headers })

describe('consolidated middleware rate limiter', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_TEST_MODE
    process.env.NODE_ENV = 'production'
    process.env.RATE_LIMIT_ENFORCE_IN_TESTS = 'true'
    resetRateLimiters()
  })

  afterEach(() => {
    process.env = originalEnv
    resetRateLimiters()
  })

  it('checks explicit identifiers with the tiered limiter', async () => {
    await expect(checkRateLimit('user-1', 'strict')).resolves.toBeNull()

    let blocked: Response | null = null
    for (let i = 0; i < 10; i += 1) {
      blocked = await checkRateLimit('user-1', 'strict')
    }

    expect(blocked?.status).toBe(429)
    expect(blocked?.headers.get('Retry-After')).toBeTruthy()
    expect(blocked?.headers.get('X-RateLimit-Limit')).toBe('10')
  })

  it('uses x-forwarded-for as the request identifier without Supabase auth state', async () => {
    for (let i = 0; i < 10; i += 1) {
      await expect(
        rateLimit(
          makeRequest({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' }),
          'strict'
        )
      ).resolves.toBeNull()
    }

    const blocked = await rateLimit(
      makeRequest({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' }),
      'strict'
    )

    expect(blocked?.status).toBe(429)
  })

  it('bypasses checks in tests unless enforcement is explicitly enabled', async () => {
    process.env.NODE_ENV = 'test'
    delete process.env.RATE_LIMIT_ENFORCE_IN_TESTS

    for (let i = 0; i < 25; i += 1) {
      await expect(checkRateLimit('test-user', 'strict')).resolves.toBeNull()
    }
  })
})
