import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { getServerAppUrl, buildServerRedirectUrl } from '@/lib/utils/server-url'

const headersMock = jest.fn()
jest.mock('next/headers', () => ({
  __esModule: true,
  headers: (...args: unknown[]) => headersMock(...args),
}))

jest.mock('@/lib/utils/site-url', () => ({
  __esModule: true,
  DEFAULT_APP_URL: 'https://default.test',
  getEnvAppUrl: () => 'https://env.test',
  normalizeOrigin: (url?: string | null) => url || null,
}))

describe('server-url utils', () => {
  beforeEach(() => {
    headersMock.mockReset()
  })

  test('prefers forwarded host/proto', async () => {
    headersMock.mockReturnValue({
      get: (key: string) =>
        ({
          'x-forwarded-host': 'forwarded.example.com',
          'x-forwarded-proto': 'https',
        })[key.toLowerCase()] ?? null,
    })

    const url = await getServerAppUrl()
    expect(headersMock).toHaveBeenCalled()
    expect(url).toBe('https://forwarded.example.com')
  })

  test('falls back to origin then host', async () => {
    headersMock.mockReturnValue({
      get: (key: string) =>
        ({
          origin: 'https://origin.example.com',
          host: 'host.example.com',
        })[key.toLowerCase()] ?? null,
    })

    const url = await getServerAppUrl()
    expect(headersMock).toHaveBeenCalled()
    expect(url).toBe('https://origin.example.com')
  })

  test('buildServerRedirectUrl appends path to base', async () => {
    headersMock.mockReturnValue({
      get: () => null,
    })

    const url = await buildServerRedirectUrl('/foo')
    expect(url).toBe('https://env.test/foo')
  })
})
