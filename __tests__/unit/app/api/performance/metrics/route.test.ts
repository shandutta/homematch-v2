import { beforeEach, describe, expect, test, jest } from '@jest/globals'
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

const createPostRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/performance/metrics', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
  })

const createGetRequest = (url: string) => new NextRequest(url)

describe('performance metrics API route', () => {
  beforeEach(() => {
    jest.resetModules()
    jsonMock.mockClear()
  })

  test('accepts metrics payloads and logs poor metrics', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const route = await import('@/app/api/performance/metrics/route')

    await route.POST(
      createPostRequest({
        metrics: [
          {
            name: 'lcp',
            value: 1200,
            rating: 'poor',
            delta: 1,
            id: 'metric-1',
            timestamp: 1,
          },
        ],
        customMetrics: [
          { name: 'long_task', value: 150, timestamp: 1 },
          { name: 'slow_resource', value: 1500, timestamp: 1 },
          { name: 'memory_usage', value: 600, timestamp: 1 },
        ],
        url: 'https://example.com/dashboard',
        userAgent: 'jest',
        timestamp: 1,
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body).toEqual({ success: true, received: 1 })
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  test('returns 400 for invalid payloads', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const route = await import('@/app/api/performance/metrics/route')

    await route.POST(createPostRequest({}))

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body.error).toBe('Invalid metrics payload')
    errorSpy.mockRestore()
  })

  test('filters metrics and returns aggregates', async () => {
    const route = await import('@/app/api/performance/metrics/route')

    await route.POST(
      createPostRequest({
        metrics: [
          {
            name: 'lcp',
            value: 120,
            rating: 'good',
            id: 'metric-1',
            timestamp: 1,
          },
        ],
        url: 'https://example.com/dashboard',
        userAgent: 'jest',
        timestamp: 1,
      })
    )

    await route.POST(
      createPostRequest({
        metrics: [
          {
            name: 'lcp',
            value: 350,
            rating: 'poor',
            id: 'metric-2',
            timestamp: 2,
          },
        ],
        url: 'https://example.com/dashboard',
        userAgent: 'jest',
        timestamp: 2,
      })
    )

    await route.GET(
      createGetRequest(
        'http://localhost/api/performance/metrics?rating=poor&metric=lcp'
      )
    )

    const [body] = jsonMock.mock.calls.at(-1)!
    expect(body.total).toBe(1)
    expect(body.metrics).toHaveLength(1)
    expect(body.aggregates.lcp.count).toBe(1)
    expect(body.aggregates.lcp.max).toBe(350)
  })
})
