import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  jest,
} from '@jest/globals'
import { NextRequest } from 'next/server'

const jsonMock = jest.fn((body, init) => ({
  status: init?.status ?? 200,
  body,
}))

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (...args: unknown[]) => jsonMock(...args),
  },
  NextRequest:
    jest.requireActual<typeof import('next/server')>('next/server').NextRequest,
}))

const createApiClientMock = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: (...args: unknown[]) => createApiClientMock(...args),
}))

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
  from: jest.fn(),
}

type QueryResult = { data: unknown; error: unknown }
type QueryChain = {
  select: jest.Mock
  order: jest.Mock
  eq: jest.Mock
  range: jest.Mock
  then: <TResult>(
    resolve: (value: QueryResult) => TResult,
    reject: (reason: unknown) => TResult
  ) => Promise<TResult>
}

const createQueryChain = (result: QueryResult): QueryChain => {
  const chain: QueryChain = {
    select: jest.fn(() => chain),
    order: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    range: jest.fn(() => chain),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

const createRequest = (url: string) => new NextRequest(url)

describe('neighborhoods vibes API route', () => {
  let route: typeof import('@/app/api/neighborhoods/vibes/route')

  beforeAll(async () => {
    route = await import('@/app/api/neighborhoods/vibes/route')
  })

  beforeEach(() => {
    jsonMock.mockClear()
    createApiClientMock.mockReset()
    createApiClientMock.mockReturnValue(supabaseMock)
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockReset()
  })

  test('returns 401 when unauthenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await route.GET(createRequest('http://localhost/api/neighborhoods/vibes'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 503 when neighborhoods table is missing', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    const chain = createQueryChain({
      data: null,
      error: { code: '42P01' },
    })
    supabaseMock.from.mockReturnValue(chain)

    await route.GET(createRequest('http://localhost/api/neighborhoods/vibes'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(503)
    expect(body.error).toContain('Neighborhood vibes not initialized')
  })

  test('returns 500 when query fails', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    const chain = createQueryChain({
      data: null,
      error: { code: '500' },
    })
    supabaseMock.from.mockReturnValue(chain)

    await route.GET(createRequest('http://localhost/api/neighborhoods/vibes'))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Failed to fetch neighborhood vibes')
  })

  test('uses range pagination when neighborhoodId is missing', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    const chain = createQueryChain({
      data: [{ id: 'v1' }],
      error: null,
    })
    supabaseMock.from.mockReturnValue(chain)

    await route.GET(
      createRequest('http://localhost/api/neighborhoods/vibes?limit=2&offset=1')
    )

    expect(chain.range).toHaveBeenCalledWith(1, 2)
    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.data).toEqual([{ id: 'v1' }])
  })

  test('filters by neighborhoodId when provided', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    const chain = createQueryChain({
      data: [{ id: 'v1' }],
      error: null,
    })
    supabaseMock.from.mockReturnValue(chain)

    await route.GET(
      createRequest(
        'http://localhost/api/neighborhoods/vibes?neighborhoodId=nb-1'
      )
    )

    expect(chain.eq).toHaveBeenCalledWith('neighborhood_id', 'nb-1')
    expect(chain.range).not.toHaveBeenCalled()
  })
})
