import {
  describe,
  test,
  expect,
  beforeEach,
  afterAll,
  jest,
} from '@jest/globals'
import { GET } from '@/app/api/maps/script/route'

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
  }
})

const originalEnv = process.env

describe('maps script API route', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    jsonMock.mockClear()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('returns 503 when server API key is missing', async () => {
    delete process.env.GOOGLE_MAPS_SERVER_API_KEY

    await GET()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(503)
    expect(body.error).toBe('Maps service unavailable')
  })

  test('returns proxy script URL when configured', async () => {
    process.env.GOOGLE_MAPS_SERVER_API_KEY = 'test-key'

    await GET()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body.status).toBe('ready')
    expect(body.scriptUrl).toBe('/api/maps/proxy-script')
  })
})
