// Phase 0/1 closure: P1-route-deadline-helper
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'
import { readFileSync } from 'fs'

const jsonMock = jest.fn()

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => jsonMock(body, init),
  },
}))

describe('route deadline helper', () => {
  beforeEach(() => {
    jsonMock.mockImplementation((body: unknown, init?: ResponseInit) => ({
      status: init?.status ?? 200,
      body,
    }))
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
    jsonMock.mockClear()
    jest.restoreAllMocks()
  })

  test('returns a consistent 504 response when a route handler misses its deadline', async () => {
    jest.useFakeTimers()
    const { withRouteDeadline } = await import('@/lib/api/route-deadline')
    const handler = jest.fn(
      () => new Promise<Response>((resolve) => setTimeout(resolve, 1000))
    )
    const guarded = withRouteDeadline('users:search', 50, handler)

    const responsePromise = guarded()
    await jest.advanceTimersByTimeAsync(50)
    const response = await responsePromise

    expect(response.status).toBe(504)
    expect(jsonMock).toHaveBeenCalledWith(
      {
        error: 'users:search exceeded 50ms route deadline',
        code: 'GATEWAY_TIMEOUT',
      },
      { status: 504 }
    )
  })

  test('passes through successful route responses before the deadline', async () => {
    jest.useFakeTimers()
    const { withRouteDeadline } = await import('@/lib/api/route-deadline')
    const expected = new Response(JSON.stringify({ ok: true }), { status: 200 })
    const guarded = withRouteDeadline(
      'couples:disputed',
      1000,
      async () => expected
    )

    await expect(guarded()).resolves.toBe(expected)
  })

  test('does not swallow non-timeout route errors', async () => {
    const { withRouteDeadline } = await import('@/lib/api/route-deadline')
    const error = new Error('database failed')
    const guarded = withRouteDeadline('users:avatar', 1000, async () => {
      throw error
    })

    await expect(guarded()).rejects.toBe(error)
  })
})

describe('long Supabase-heavy route deadline adoption guard', () => {
  test.each([
    ['users:search', 'src/app/api/users/search/route.ts'],
    ['couples:disputed', 'src/app/api/couples/disputed/route.ts'],
    ['users:avatar', 'src/app/api/users/avatar/route.ts'],
  ])('%s route is guarded by withRouteDeadline', (_label, routePath) => {
    const source = readFileSync(routePath, 'utf8')

    expect(source).toContain('@/lib/api/route-deadline')
    expect(source).toContain('withRouteDeadline(')
  })
})
