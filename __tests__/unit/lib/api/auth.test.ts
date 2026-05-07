import { beforeAll, describe, expect, jest, test } from '@jest/globals'
import { NextRequest } from 'next/server'
import { getUserFromRequest, requireUserFromRequest } from '@/lib/api/auth'

beforeAll(() => {
  if (typeof Response.json !== 'function') {
    Object.defineProperty(Response, 'json', {
      configurable: true,
      value: (body: unknown, init?: ResponseInit) =>
        new Response(JSON.stringify(body), {
          ...init,
          headers: { 'content-type': 'application/json' },
        }),
    })
  }
})

const makeRequest = (authorization?: string): NextRequest =>
  new NextRequest('https://homematch.test/api/example', {
    headers: authorization ? { authorization } : {},
  })

const makeSupabase = (results: unknown[]) => {
  const getUser = jest.fn()
  results.forEach((result) => getUser.mockResolvedValueOnce(result))

  return {
    auth: { getUser },
  }
}

describe('getUserFromRequest', () => {
  test('uses bearer token when present', async () => {
    const user = { id: 'user-1' }
    const supabase = makeSupabase([{ data: { user }, error: null }])

    const result = await getUserFromRequest(
      supabase,
      makeRequest('Bearer token-123')
    )

    expect(result.data.user).toBe(user)
    expect(supabase.auth.getUser).toHaveBeenCalledWith('token-123')
  })

  test('falls back to cookie/session context when bearer lookup misses', async () => {
    const user = { id: 'user-2' }
    const supabase = makeSupabase([
      { data: { user: null }, error: new Error('bad bearer') },
      { data: { user }, error: null },
    ])

    const result = await getUserFromRequest(
      supabase,
      makeRequest('Bearer stale-token')
    )

    expect(result.data.user).toBe(user)
    expect(supabase.auth.getUser).toHaveBeenNthCalledWith(1, 'stale-token')
    expect(supabase.auth.getUser).toHaveBeenNthCalledWith(2)
  })
})

describe('requireUserFromRequest', () => {
  test('returns the authenticated user and no response when auth succeeds', async () => {
    const user = { id: 'user-3' }
    const supabase = makeSupabase([{ data: { user }, error: null }])

    const result = await requireUserFromRequest(supabase, makeRequest())

    expect(result.user).toBe(user)
    expect(result.response).toBeNull()
  })

  test('returns a standardized unauthorized response when auth fails', async () => {
    const supabase = makeSupabase([
      { data: { user: null }, error: new Error('missing session') },
    ])

    const result = await requireUserFromRequest(supabase, makeRequest())
    const body = await result.response?.json()

    expect(result.user).toBeNull()
    expect(result.response?.status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
  })
})
