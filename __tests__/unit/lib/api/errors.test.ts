import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { z } from 'zod'
import { ApiErrorHandler } from '@/lib/api/errors'

const jsonMock = jest.fn((body, init) => ({
  status: init?.status ?? 200,
  body,
}))

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (...args: unknown[]) => jsonMock(...args),
  },
}))

describe('ApiErrorHandler', () => {
  beforeEach(() => {
    jsonMock.mockClear()
  })

  it('builds bad request responses', () => {
    ApiErrorHandler.badRequest('Missing data', { field: 'name' })

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body).toEqual({
      error: 'Missing data',
      code: 'BAD_REQUEST',
      details: { field: 'name' },
    })
  })

  it('builds unauthorized responses', () => {
    ApiErrorHandler.unauthorized()

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(401)
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('builds forbidden responses', () => {
    ApiErrorHandler.forbidden('Nope')

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(403)
    expect(body.error).toBe('Nope')
  })

  it('builds not found responses', () => {
    ApiErrorHandler.notFound('Missing')

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(404)
    expect(body.code).toBe('NOT_FOUND')
  })

  it('logs and builds server error responses', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    ApiErrorHandler.serverError('Boom', { detail: 'x' })

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(500)
    expect(body.error).toBe('Boom')
    expect(errorSpy).toHaveBeenCalledWith('Server error:', 'Boom', {
      detail: 'x',
    })

    errorSpy.mockRestore()
  })

  it('maps zod errors to bad requests', () => {
    const schema = z.object({ name: z.string().min(1) })
    try {
      schema.parse({ name: '' })
    } catch (error) {
      if (error instanceof z.ZodError) {
        ApiErrorHandler.fromZodError(error)
      } else {
        throw error
      }
    }

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })

  it.each([
    ['methodNotAllowed', 'METHOD_NOT_ALLOWED', 405],
    ['tooManyRequests', 'RATE_LIMITED', 429],
    ['serviceUnavailable', 'SERVICE_UNAVAILABLE', 503],
    ['badGateway', 'BAD_GATEWAY', 502],
    ['gatewayTimeout', 'GATEWAY_TIMEOUT', 504],
  ] as const)('builds %s responses', (method, code, status) => {
    ApiErrorHandler[method]('Standardized error')

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(status)
    expect(body).toEqual({ error: 'Standardized error', code })
  })

  it('preserves headers for rate-limit responses', () => {
    ApiErrorHandler.tooManyRequests('Slow down', {
      'Retry-After': '60',
    })

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init).toEqual({
      status: 429,
      headers: { 'Retry-After': '60' },
    })
    expect(body).toEqual({ error: 'Slow down', code: 'RATE_LIMITED' })
  })

  it('wraps success payloads', () => {
    ApiErrorHandler.success({ ok: true })

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status ?? 200).toBe(200)
    expect(body).toEqual({ data: { ok: true }, success: true })
  })
})
