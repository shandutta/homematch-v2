import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/couples/stats/route'

const jsonMock = jest.fn((body, init) => ({
  status: init?.status ?? 200,
  body,
}))

jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return {
    ...actual,
    NextResponse: {
      json: (...args: unknown[]) => jsonMock(...args),
    },
    NextRequest: actual.NextRequest,
  }
})

const supabaseMock = {}
const createApiClientMock = jest.fn(() => supabaseMock)

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: (...args: unknown[]) => createApiClientMock(...args),
}))

const getUserFromRequestMock = jest.fn()

jest.mock('@/lib/api/auth', () => ({
  __esModule: true,
  getUserFromRequest: (...args: unknown[]) => getUserFromRequestMock(...args),
}))

const getHouseholdStatsMock = jest.fn()

jest.mock('@/lib/services/couples', () => ({
  __esModule: true,
  CouplesService: {
    getHouseholdStats: (...args: unknown[]) => getHouseholdStatsMock(...args),
  },
}))

describe('couples stats API route', () => {
  const createRequest = () =>
    new NextRequest('http://localhost/api/couples/stats')

  beforeEach(() => {
    jsonMock.mockClear()
    createApiClientMock.mockClear()
    getUserFromRequestMock.mockReset()
    getHouseholdStatsMock.mockReset()
  })

  test('returns 401 when unauthenticated', async () => {
    getUserFromRequestMock.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await GET(createRequest())

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 404 when stats are missing', async () => {
    getUserFromRequestMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    getHouseholdStatsMock.mockResolvedValue(null)

    await GET(createRequest())

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(404)
    expect(body.error).toBe('Household not found or no statistics available')
  })

  test('returns stats when available', async () => {
    getUserFromRequestMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    getHouseholdStatsMock.mockResolvedValue({ viewed: 12 })

    await GET(createRequest())

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.stats).toEqual({ viewed: 12 })
  })

  test('returns 500 when service throws', async () => {
    getUserFromRequestMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    getHouseholdStatsMock.mockRejectedValue(new Error('boom'))

    await GET(createRequest())

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to fetch household statistics')
  })
})
