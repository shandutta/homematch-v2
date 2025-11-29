/**
 * Integration test for /api/interactions
 * Exercises authenticated 200-paths against the Next.js route implementation.
 *
 * Uses E2EHttpClient to get fresh auth tokens per test run, avoiding
 * token expiration issues with static TEST_AUTH_TOKEN env var.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { E2EHttpClient } from '../../utils/e2e-http-client'

describe('Integration: /api/interactions (authenticated paths)', () => {
  let client: E2EHttpClient

  beforeAll(async () => {
    client = new E2EHttpClient()
    await client.authenticateAs('test1@example.com', 'testpassword123')
  })

  afterAll(async () => {
    await client.cleanup()
  })

  it('GET ?type=summary returns 200 and summary payload', async () => {
    const response = await client.get('/api/interactions?type=summary')

    // We expect authorized success; if you see 401 here, check auth setup
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body).toBeDefined()
    expect(typeof body).toBe('object')
    // Minimal shape checks; project may evolve exact numbers
    expect(Object.prototype.hasOwnProperty.call(body, 'viewed')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(body, 'liked')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(body, 'passed')).toBe(true)
  })

  it('GET ?type=viewed (cursor/limit) returns 200 with items and nextCursor', async () => {
    const response = await client.get(
      '/api/interactions?type=viewed&cursor=&limit=10'
    )

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body).toBeDefined()
    expect(typeof body).toBe('object')
    expect(Array.isArray(body.items)).toBe(true)
    // nextCursor can be string or null depending on data
    expect(Object.prototype.hasOwnProperty.call(body, 'nextCursor')).toBe(true)
  })

  it('GET ?type=liked returns 200 and items array', async () => {
    const response = await client.get('/api/interactions?type=liked')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body).toBeDefined()
    expect(Array.isArray(body.items)).toBe(true)
  })

  it('GET ?type=skip returns 200 and items array', async () => {
    const response = await client.get('/api/interactions?type=skip')

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body).toBeDefined()
    expect(Array.isArray(body.items)).toBe(true)
  })
})
