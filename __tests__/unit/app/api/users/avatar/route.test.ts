import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'

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
  storage: {
    from: jest.Mock
  }
}

const supabaseMock: SupabaseMock = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  storage: {
    from: jest.fn(),
  },
}

type MockRequestInit = {
  headers?: Record<string, string>
  formData?: FormData
}

const createRequest = ({ headers = {}, formData }: MockRequestInit = {}) =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- tests only need the route handler's headers/formData surface.
  ({
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    formData: jest.fn(async () => formData ?? new FormData()),
  }) as never

describe('users avatar API auth boundary', () => {
  let route: typeof import('@/app/api/users/avatar/route')

  beforeAll(async () => {
    route = await import('@/app/api/users/avatar/route')
  })

  beforeEach(() => {
    jsonMock.mockClear()
    createApiClientMock.mockReset()
    createApiClientMock.mockReturnValue(supabaseMock)
    supabaseMock.auth.getUser.mockReset()
    supabaseMock.from.mockReset()
    supabaseMock.storage.from.mockReset()
  })

  test('POST retries stale bearer auth against request session context', async () => {
    supabaseMock.auth.getUser
      .mockResolvedValueOnce({ data: { user: null }, error: null })
      .mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null })

    const formData = new FormData()
    await route.POST(
      createRequest({
        headers: { authorization: 'Bearer stale-token' },
        formData,
      })
    )

    expect(supabaseMock.auth.getUser).toHaveBeenNthCalledWith(1, 'stale-token')
    expect(supabaseMock.auth.getUser).toHaveBeenNthCalledWith(2)
    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body.error).toBe('No file provided')
  })

  test('DELETE retries stale bearer auth before touching profile/storage', async () => {
    supabaseMock.auth.getUser
      .mockResolvedValueOnce({ data: { user: null }, error: null })
      .mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null })
    supabaseMock.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    await route.DELETE(
      createRequest({
        headers: { authorization: 'Bearer stale-token' },
      })
    )

    expect(supabaseMock.auth.getUser).toHaveBeenNthCalledWith(1, 'stale-token')
    expect(supabaseMock.auth.getUser).toHaveBeenNthCalledWith(2)
    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(404)
    expect(body.error).toBe('User profile not found')
  })
})
