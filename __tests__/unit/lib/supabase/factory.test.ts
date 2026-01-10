import {
  describe,
  beforeEach,
  afterEach,
  test,
  expect,
  jest,
} from '@jest/globals'
import { NextRequest } from 'next/server'
import { SupabaseClientFactory, createClient } from '@/lib/supabase/factory'
import { ClientContext } from '@/lib/services/interfaces'

const createBrowserClientMock = jest.fn()
const createServerClientMock = jest.fn()
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
  Reflect.deleteProperty(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', {
    value: undefined,
    configurable: true,
    writable: true,
  })
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
      set: jest.fn(),
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
      ) => ({
        client: 'server',
        options,
      })
    )
  })

  afterEach(() => {
    const factory = SupabaseClientFactory.getInstance()
    factory.clearCache()
    Reflect.set(SupabaseClientFactory, 'instance', undefined)
  })

  test('creates browser client when window is defined and caches it', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    })

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

  test('creates service client and caches it', async () => {
    const factory = SupabaseClientFactory.getInstance()

    await factory.createClient({ context: ClientContext.SERVICE })
    await factory.createClient({ context: ClientContext.SERVICE })

    expect(createServerClientMock).toHaveBeenCalledTimes(1)
    const [, key] = createServerClientMock.mock.calls[0]
    expect(key).toBe('service-key')
  })

  test('compat helper createClient uses factory detection', async () => {
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    })
    const client = await createClient()
    expect(client.client).toBe('browser')
  })
})
