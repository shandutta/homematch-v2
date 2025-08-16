/**
 * Integration test for /api/interactions
 * Exercises authenticated 200-paths against the Next.js route implementation.
 *
 * Prereqs for this to pass in CI:
 * - Test server started (Next dev or production build) OR NextRequest handler invoked with proper auth context.
 * - Auth layer available in test infra (e.g., Supabase test user/session or mock auth in middleware).
 *
 * If you run a dev server in CI for integration tests, set TEST_API_URL (e.g., http://localhost:3000)
 * and a valid TEST_AUTH_TOKEN for Authorization header (Bearer).
 */
import { describe, it, expect  } from 'vitest'
/* eslint-env jest, browser */ // Provide DOM lib globals (RequestInit) and Jest globals without disabling rules

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000'
const AUTH_HEADER = process.env.TEST_AUTH_TOKEN
  ? { Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN}` }
  : undefined

const fetchJson = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      ...(AUTH_HEADER || {}),
      ...(init?.headers || {}),
    },
    ...init,
  })
  let body: any = {}
  try {
    body = await res.json()
  } catch {
    // non-JSON body
  }
  return { status: res.status, body }
}

const requireAuth = () => {
  if (!AUTH_HEADER) {
    // Provide a clear guidance rather than failing obscurely
    // This test expects a working auth token to validate 200-paths
    throw new Error(
      'TEST_AUTH_TOKEN env var is required for authenticated integration tests. ' +
        'Set TEST_API_URL (e.g., http://localhost:3000) and TEST_AUTH_TOKEN in CI/local env.'
    )
  }
}

describe('Integration: /api/interactions (authenticated paths)', () => {
  it('GET ?type=summary returns 200 and summary payload', async () => {
    requireAuth()

    const { status, body } = await fetchJson('/api/interactions?type=summary')

    // We expect authorized success; if you see 401 here, fix TEST_AUTH_TOKEN provisioning in test infra.
    expect(status).toBe(200)
    expect(body).toBeDefined()
    expect(typeof body).toBe('object')
    // Minimal shape checks; project may evolve exact numbers
    expect(Object.prototype.hasOwnProperty.call(body, 'viewed')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(body, 'liked')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(body, 'passed')).toBe(true)
  })

  it('GET ?type=viewed (cursor/limit) returns 200 with items and nextCursor', async () => {
    requireAuth()

    const { status, body } = await fetchJson(
      '/api/interactions?type=viewed&cursor=&limit=10'
    )

    expect(status).toBe(200)
    expect(body).toBeDefined()
    expect(typeof body).toBe('object')
    expect(Array.isArray(body.items)).toBe(true)
    // nextCursor can be string or null depending on data
    expect(Object.prototype.hasOwnProperty.call(body, 'nextCursor')).toBe(true)
  })

  it('GET ?type=liked returns 200 and items array', async () => {
    requireAuth()

    const { status, body } = await fetchJson('/api/interactions?type=liked')

    expect(status).toBe(200)
    expect(body).toBeDefined()
    expect(Array.isArray(body.items)).toBe(true)
  })

  it('GET ?type=skip returns 200 and items array', async () => {
    requireAuth()

    const { status, body } = await fetchJson('/api/interactions?type=skip')

    expect(status).toBe(200)
    expect(body).toBeDefined()
    expect(Array.isArray(body.items)).toBe(true)
  })
})
