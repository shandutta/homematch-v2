/**
 * @jest-environment node
 */
// Phase 0/1 closure: D1-service-role-rbac

import {
  describe,
  beforeEach,
  afterEach,
  expect,
  jest,
  test,
} from '@jest/globals'

jest.unmock('@/lib/supabase/server')

type AnyMockFn = (...args: unknown[]) => unknown
type AnyAsyncMockFn = (...args: unknown[]) => Promise<unknown>

const createServerClientMock = jest.fn<AnyMockFn>()
const cookiesSetMock = jest.fn<AnyMockFn>()
const headersGetMock = jest.fn<AnyMockFn>()
let warnSpy: jest.SpiedFunction<typeof console.warn>

jest.mock('@supabase/ssr', () => ({
  __esModule: true,
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}))

jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: () => ({
    getAll: () => [],
    set: cookiesSetMock,
  }),
  headers: () => ({
    get: headersGetMock,
  }),
}))

type Assignment = {
  role: string
  enabled: boolean
  expires_at: string | null
}

function createAuthorizationClient({
  userId = 'user-1',
  getUserError = null,
  assignment = { role: 'admin', enabled: true, expires_at: null },
  assignmentError = null,
}: {
  userId?: string | null
  getUserError?: unknown
  assignment?: Assignment | null
  assignmentError?: unknown
} = {}) {
  const maybeSingleMock = jest.fn<AnyAsyncMockFn>().mockResolvedValue({
    data: assignment,
    error: assignmentError,
  })
  const eqMock = jest.fn<AnyMockFn>(() => ({ maybeSingle: maybeSingleMock }))
  const selectMock = jest.fn<AnyMockFn>(() => ({ eq: eqMock }))
  const fromMock = jest.fn<AnyMockFn>(() => ({ select: selectMock }))
  const authGetUserMock = jest.fn<AnyAsyncMockFn>().mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
    error: getUserError,
  })
  const authGetSessionMock = jest.fn<AnyAsyncMockFn>().mockResolvedValue({
    data: { session: null },
    error: null,
  })
  const authSignOutMock = jest
    .fn<AnyAsyncMockFn>()
    .mockResolvedValue({ error: null })

  const client = {
    auth: {
      getUser: authGetUserMock,
      getSession: authGetSessionMock,
      signOut: authSignOutMock,
    },
    from: fromMock,
  }

  return {
    client,
    authGetUserMock,
    fromMock,
    selectMock,
    eqMock,
    maybeSingleMock,
  }
}

async function loadCreateServiceClient() {
  const { createServiceClient } = await import('@/lib/supabase/server')
  return createServiceClient
}

describe('service-role authorization gate', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    }
    headersGetMock.mockReturnValue(null)
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    process.env = originalEnv
  })

  test('allows enabled unexpired admin assignments from the dedicated authority table', async () => {
    const authorization = createAuthorizationClient()
    const serviceClient = { service: true }
    createServerClientMock
      .mockReturnValueOnce(authorization.client)
      .mockReturnValueOnce(serviceClient)

    const createServiceClient = await loadCreateServiceClient()

    await expect(createServiceClient()).resolves.toBe(serviceClient)
    expect(authorization.fromMock).toHaveBeenCalledWith(
      'admin_role_assignments'
    )
    expect(authorization.selectMock).toHaveBeenCalledWith(
      'role, enabled, expires_at'
    )
    expect(authorization.eqMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(createServerClientMock).toHaveBeenCalledTimes(2)
    expect(createServerClientMock).toHaveBeenLastCalledWith(
      'http://localhost:54321',
      'service-role-key',
      expect.any(Object)
    )
  })

  test('rejects users without an admin role assignment', async () => {
    const authorization = createAuthorizationClient({ assignment: null })
    createServerClientMock.mockReturnValueOnce(authorization.client)

    const createServiceClient = await loadCreateServiceClient()

    await expect(createServiceClient()).rejects.toThrow(
      'Unauthorized access to service role client'
    )
    expect(createServerClientMock).toHaveBeenCalledTimes(1)
  })

  test('rejects disabled admin assignments', async () => {
    const authorization = createAuthorizationClient({
      assignment: { role: 'admin', enabled: false, expires_at: null },
    })
    createServerClientMock.mockReturnValueOnce(authorization.client)

    const createServiceClient = await loadCreateServiceClient()

    await expect(createServiceClient()).rejects.toThrow(
      'Unauthorized access to service role client'
    )
  })

  test('rejects expired admin assignments', async () => {
    const authorization = createAuthorizationClient({
      assignment: {
        role: 'admin',
        enabled: true,
        expires_at: '2000-01-01T00:00:00.000Z',
      },
    })
    createServerClientMock.mockReturnValueOnce(authorization.client)

    const createServiceClient = await loadCreateServiceClient()

    await expect(createServiceClient()).rejects.toThrow(
      'Unauthorized access to service role client'
    )
  })

  test('fails closed when the assignment query errors', async () => {
    const authorization = createAuthorizationClient({
      assignment: null,
      assignmentError: { message: 'permission denied' },
    })
    createServerClientMock.mockReturnValueOnce(authorization.client)

    const createServiceClient = await loadCreateServiceClient()

    await expect(createServiceClient()).rejects.toThrow(
      'Unauthorized access to service role client'
    )
  })

  test('fails closed on invalid refresh tokens without querying assignments', async () => {
    const authorization = createAuthorizationClient({
      userId: null,
      getUserError: {
        code: 'refresh_token_not_found',
        message: 'Invalid Refresh Token: Refresh Token Not Found',
      },
    })
    createServerClientMock.mockReturnValueOnce(authorization.client)

    const createServiceClient = await loadCreateServiceClient()

    await expect(createServiceClient()).rejects.toThrow(
      'Unauthorized access to service role client'
    )
    expect(authorization.fromMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
  })
})
