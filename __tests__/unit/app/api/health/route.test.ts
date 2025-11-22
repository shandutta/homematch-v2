import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { GET as healthGet } from '@/app/api/health/route'

const createClientMock = jest.fn()
const jsonMock = jest.fn((body, init) => ({
  status: init?.status ?? 200,
  json: async () => body,
  headers: init?.headers,
}))

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (...args: unknown[]) => jsonMock(...args),
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createClient: (...args: unknown[]) => createClientMock(...args),
}))

const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockLimit = jest.fn()
const mockSingle = jest.fn()
let supabaseMock: any

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    supabaseMock = {
      from: mockFrom,
      select: mockSelect,
      limit: mockLimit,
      single: mockSingle,
    }
    createClientMock.mockResolvedValue(supabaseMock)
    mockFrom.mockReturnValue(supabaseMock)
    mockSelect.mockReturnValue(supabaseMock)
    mockLimit.mockReturnValue(supabaseMock)
    mockSingle.mockResolvedValue({ error: null })
  })

  test('returns healthy response when DB connectivity succeeds', async () => {
    await healthGet({} as any)
    const [body, init] = jsonMock.mock.calls.at(-1)!

    expect(init?.status).toBe(200)
    expect(body.status).toBe('healthy')
    expect(body.database).toBe('connected')
  })

  test('returns degraded response when DB connectivity fails', async () => {
    mockSingle.mockResolvedValueOnce({ error: { message: 'db down' } })

    await healthGet({} as any)
    const [body, init] = jsonMock.mock.calls.at(-1)!

    expect(init?.status).toBe(503)
    expect(body.database).toBe('error')
    expect(body.database_error).toContain('db down')
  })
})
