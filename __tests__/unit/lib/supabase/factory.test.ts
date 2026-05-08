import {
  describe,
  beforeEach,
  afterEach,
  test,
  expect,
  jest,
} from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'
import { NextRequest } from 'next/server'
import { SupabaseClientFactory, createClient } from '@/lib/supabase/factory'
import { ClientContext } from '@/lib/services/interfaces'

const createBrowserClientMock = jest.fn()
const createServerClientMock = jest.fn()
const mockCookieSet = jest.fn<
  (name: string, value: string, options: Record<string, unknown>) => void
>()
const cookiesMock = jest.fn()
const headersMock = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: (...args: unknown[]) => createBrowserClientMock(...args),
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}))

jest.mock('next/headers', () => ({
  cookies: () => cookiesMock(),
  headers: () => headersMock(),
}))

const resetEnv = () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
}

describe('SupabaseClientFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetEnv()
    cookiesMock.mockReturnValue({
      getAll: () => [],
      set: mockCookieSet,
    })
    headersMock.mockReturnValue({
      get: () => null,
    })
    createBrowserClientMock.mockReturnValue({ client: 'browser' })
    createServerClientMock.mockImplementation(
      (
        _url: string,
        _key: string,
        options?: { cookies?: { getAll: () => unknown[] }; global?: unknown }
      ) => {
        // Simulate Supabase SSR calling setAll
        options?.cookies?.setAll([
          {
            name: 'sb-test-auth-token',
            value: 'mock-token',
            options: { path: '/', sameSite: 'lax' },
          },
          {
            name: 'sb-test-auth-token-code-verifier',
            value: 'mock-verifier',
            options: {},
          },
        ])

        return {
          client: 'server',
          options,
        }
      }
    )
  })

  afterEach(() => {
    const factory = SupabaseClientFactory.getInstance()
    factory.clearCache()
    Reflect.set(SupabaseClientFactory, 'instance', undefined)
  })

  test('creates browser client when window is defined and caches it', async () => {
    const factory = SupabaseClientFactory.getInstance()
    const first = await factory.createClient()
    const second = await factory.createClient()

    expect(createBrowserClientMock).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
    expect(first).toEqual({ client: 'browser' })
  })

  test('creates server client when context is server', async () => {
    const factory = SupabaseClientFactory.getInstance()
    const client = await factory.createClient({ context: ClientContext.SERVER })

    expect(createServerClientMock).toHaveBeenCalledTimes(1)
    expect(client.client).toBe('server')
  })

  test('creates API client with auth header and cookies from request', async () => {
    const factory = SupabaseClientFactory.getInstance()
    const request = new NextRequest('http://example.test', {
      headers: {
        authorization: 'Bearer test-token',
        cookie: 'a=1; b=two',
      },
    })

    await factory.createClient({ context: ClientContext.API, request })

    expect(createServerClientMock).toHaveBeenCalledTimes(1)
    const [, , options] = createServerClientMock.mock.calls[0]
    expect(options?.cookies?.getAll()).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: 'two' },
    ])
    expect(options?.global?.headers).toEqual({
      Authorization: 'Bearer test-token',
    })
  })

  test('creates fresh service clients so key rotation is not pinned in memory', async () => {
    const factory = SupabaseClientFactory.getInstance()

    await factory.createClient({ context: ClientContext.SERVICE })
    await factory.createClient({ context: ClientContext.SERVICE })

    expect(createServerClientMock).toHaveBeenCalledTimes(2)
    const [, key] = createServerClientMock.mock.calls[0]
    expect(key).toBe('service-key')
  })

  test('does not retain the old createServerClientAsync dead stub', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/supabase/factory.ts'),
      'utf8'
    )

    expect(source).not.toContain('createServerClientAsync')
    expect(source).not.toContain('Use createServerClient() for async server contexts')
  })

  test('compat helper createClient uses factory detection', async () => {
    const client = await createClient()
    expect(client.client).toBe('browser')
  })

  test('server client sets cookies with httpOnly: true', async () => {
    const factory = SupabaseClientFactory.getInstance()
    await factory.createClient({ context: ClientContext.SERVER })

    expect(mockCookieSet).toHaveBeenCalledTimes(2)

    const setCalls = mockCookieSet.mock.calls
    for (const [_name, _value, options] of setCalls) {
      expect(options.httpOnly).toBe(true)
    }
  })

  test('server client sets cookies with secure and sameSite defaults', async () => {
    process.env.NODE_ENV = 'production'
    const factory = SupabaseClientFactory.getInstance()
    await factory.createClient({ context: ClientContext.SERVER })

    const setCalls = mockCookieSet.mock.calls
    for (const [_name, _value, options] of setCalls) {
      expect(options.secure).toBe(true)
      expect(options.sameSite).toBe('lax')
      expect(options.path).toBe('/')
    }
  })
})
