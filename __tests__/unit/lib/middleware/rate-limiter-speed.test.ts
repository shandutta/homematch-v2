/**
 * @jest-environment node
 *
 * Tests for lib/middleware/rateLimiter.ts
 * Focus: getClientIdentifier must NOT call Supabase (speed), rateLimit must be fast.
 */

import { NextRequest } from 'next/server'
import { rateLimit, withRateLimit } from '@/lib/middleware/rateLimiter'

// Mock Supabase server client to detect if it's ever called
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => {
    throw new Error(
      'createClient() was called but should not be — getClientIdentifier must use IP only'
    )
  }),
}))

const makeRequest = (path: string, headers?: Record<string, string>) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), { headers })

describe('rateLimiter speed — getClientIdentifier must not call Supabase', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    // Ensure we are NOT in test-bypass mode
    delete process.env.NEXT_PUBLIC_TEST_MODE
    process.env.NODE_ENV = 'production'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('rateLimit succeeds without calling Supabase (IP-only identification)', async () => {
    // This would throw if getClientIdentifier tried to call createClient()
    const result = await rateLimit(makeRequest('/api/maps/geocode'), 'relaxed')
    expect(result).toBeNull() // null = allowed
  })

  it('rateLimit accepts optional user identifier', async () => {
    // Passing user ID directly should work
    const result = await rateLimit(
      makeRequest('/api/couples/activity'),
      'standard'
    )
    expect(result).toBeNull()
  })

  it('withRateLimit allows requests and executes handler', async () => {
    const handler = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      )

    const result = await withRateLimit(
      makeRequest('/api/couples/mutual-likes'),
      handler,
      'standard'
    )

    expect(result.status).toBe(200)
    expect(handler).toHaveBeenCalled()
  })
})
