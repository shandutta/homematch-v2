import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/couples/mutual-likes/route'

const jsonMock = jest.fn((body, init) => ({
  status: init?.status ?? 200,
  body,
}))

const createClientMock = jest.fn()

jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextResponse: {
      json: (...args: unknown[]) => jsonMock(...args),
    },
  }
})

jest.mock('@/lib/middleware/rateLimiter', () => ({
  __esModule: true,
  withRateLimit: (_req: unknown, handler: () => Promise<unknown>) => handler(),
}))

type Chain = {
  select: jest.Mock
  in: jest.Mock
  eq: jest.Mock
  then: jest.Mock
}

// Create a chainable mock that returns itself for chaining
const createChainMock = (): Chain => {
  const chain: Chain = {
    select: jest.fn(() => chain),
    in: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    then: jest.fn((resolve) => resolve({ data: [], error: null })),
  }
  return chain
}

type SupabaseMock = {
  auth: {
    getUser: jest.Mock
  }
  from: jest.Mock
}

const supabaseMock: SupabaseMock = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => createChainMock()),
}

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createClient: (...args: unknown[]) => createClientMock(...args),
  createApiClient: () => supabaseMock,
}))

jest.mock('@/lib/services/couples', () => ({
  __esModule: true,
  CouplesService: {
    getMutualLikes: jest.fn(),
  },
}))

import { CouplesService } from '@/lib/services/couples'

const resetSupabase = () => {
  supabaseMock.auth.getUser.mockReset()
  supabaseMock.from.mockReset()
  supabaseMock.from.mockImplementation(() => createChainMock())

  createClientMock.mockResolvedValue(supabaseMock)
}

describe('couples mutual-likes API route', () => {
  beforeEach(() => {
    jsonMock.mockClear()
    resetSupabase()
  })

  test('returns 401 when user is not authenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const req = new NextRequest('https://example.com/api/couples/mutual-likes')
    await GET(req)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns mutual likes even if property enrichment fails', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    jest
      .mocked(CouplesService.getMutualLikes)
      .mockResolvedValue([{ property_id: 'p1', liked_by_count: 2 }])
    // Configure from() to return a chain that errors on .in()
    const errorChain: Chain = {
      select: jest.fn(() => errorChain),
      in: jest.fn(() => errorChain),
      eq: jest.fn(() => errorChain),
      then: jest.fn((resolve) =>
        resolve({ data: null, error: { message: 'db-error' } })
      ),
    }
    supabaseMock.from.mockReturnValueOnce(errorChain)

    const req = new NextRequest('https://example.com/api/couples/mutual-likes')
    await GET(req)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.mutualLikes.length).toBe(1)
    expect(body.mutualLikes[0].property).toBeNull()
  })
})
