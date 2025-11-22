import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { GET } from '@/app/api/couples/mutual-likes/route'

const jsonMock = jest.fn((body, init) => ({
  status: init?.status ?? 200,
  body,
}))

const createApiClientMock = jest.fn()

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (...args: unknown[]) => jsonMock(...args),
  },
  NextRequest: class {},
}))

jest.mock('@/lib/middleware/rateLimiter', () => ({
  __esModule: true,
  withRateLimit: (_req: unknown, handler: () => Promise<unknown>) => handler(),
}))

const supabaseMock: any = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  select: jest.fn(),
  in: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: (...args: unknown[]) => createApiClientMock(...args),
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
  supabaseMock.select.mockReset()
  supabaseMock.in.mockReset()

  createApiClientMock.mockReturnValue(supabaseMock)
  supabaseMock.from.mockReturnValue(supabaseMock)
  supabaseMock.select.mockReturnValue(supabaseMock)
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

    await GET({ nextUrl: new URL('https://example.com') } as any)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns mutual likes even if property enrichment fails', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    CouplesService.getMutualLikes.mockResolvedValue([
      { property_id: 'p1', liked_by_count: 2 },
    ])
    supabaseMock.in.mockResolvedValueOnce({
      data: null,
      error: { message: 'db-error' },
    })

    await GET({ nextUrl: new URL('https://example.com') } as any)

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.mutualLikes.length).toBe(1)
    expect(body.mutualLikes[0].property).toBeNull()
  })
})
