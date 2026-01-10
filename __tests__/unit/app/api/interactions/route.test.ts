import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/interactions/route'

const jsonMock = jest.fn((body, init) => ({
  status: init?.status ?? 200,
  body,
}))

const createClientMock = jest.fn()

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (...args: unknown[]) => jsonMock(...args),
  },
  NextRequest:
    jest.requireActual<typeof import('next/server')>('next/server').NextRequest,
}))

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: (...args: unknown[]) => createClientMock(...args),
}))

jest.mock('@/lib/utils/rate-limit', () => ({
  apiRateLimiter: {
    check: jest.fn().mockResolvedValue({ success: true }),
  },
}))

type SupabaseMock = {
  auth: {
    getUser: jest.Mock
  }
  rpc: jest.Mock
  from: jest.Mock
  select: jest.Mock
  delete: jest.Mock
  match: jest.Mock
  insert: jest.Mock
  eq: jest.Mock
  in: jest.Mock
  order: jest.Mock
  limit: jest.Mock
}

let supabaseMock: SupabaseMock

const resetSupabaseMock = () => {
  supabaseMock = {
    auth: {
      getUser: jest.fn(),
    },
    rpc: jest.fn(),
    from: jest.fn(),
    select: jest.fn(),
    delete: jest.fn(),
    match: jest.fn(),
    insert: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
  }

  createClientMock.mockReturnValue(supabaseMock)
  supabaseMock.from.mockReturnValue(supabaseMock)
  supabaseMock.delete.mockReturnValue(supabaseMock)
  supabaseMock.match.mockResolvedValue({ error: null })
  supabaseMock.insert.mockReturnValue({
    select: () => ({
      single: () =>
        Promise.resolve({
          data: { id: 'new', property_id: 'prop', interaction_type: 'like' },
          error: null,
        }),
    }),
  })
}

describe('interactions API route', () => {
  beforeEach(() => {
    jsonMock.mockClear()
    resetSupabaseMock()
  })

  test('POST returns 401 when user is missing', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const request = new NextRequest('http://localhost/api/interactions', {
      method: 'POST',
      body: JSON.stringify({ propertyId: 'p1', type: 'like' }),
      headers: {
        'content-type': 'application/json',
      },
    })
    await POST(request)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('GET summary returns 500 when RPC fails', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    })

    const request = new NextRequest(
      'https://example.com/api/interactions?type=summary'
    )
    await GET(request)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to fetch summary')
  })
})
