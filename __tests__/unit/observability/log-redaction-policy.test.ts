// Phase 0/1 closure: D7-disputed-route-exposure
import { describe, it, expect, beforeAll, beforeEach, jest } from '@jest/globals'
import { readFileSync } from 'fs'
import * as path from 'path'

type ApiErrorHandlerModule = typeof import('@/lib/api/errors')

// NextResponse.json shim — captures the JSON body so we can inspect what
// would actually be sent to the client.
const jsonMock = jest.fn((body: unknown, init?: ResponseInit) => ({
  status: init?.status ?? 200,
  body,
}))

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (...args: unknown[]) => jsonMock(...args),
  },
}))

let ApiErrorHandler: ApiErrorHandlerModule['ApiErrorHandler']

beforeAll(async () => {
  ;({ ApiErrorHandler } = await import('@/lib/api/errors'))
})

const FAKE_SERVICE_ROLE_KEY =
  'sb_service_role_REDACTION_POLICY_TEST_zzzzzzzzzzzzzzzzzzzzzzzz'
const FAKE_ANON_KEY = 'sb_anon_REDACTION_POLICY_TEST_yyyyyyyyyyyyyyyyyyyy'
const FAKE_POSTGRES_PASSWORD = 'pg_REDACTION_POLICY_TEST_xxxxxxxxxxxxxxxxxxxx'
const FAKE_BEARER = 'eyJhbGciOiJIUzI1NiJ9.REDACTION_POLICY_TEST.payload'
const FAKE_ENV_VALUE = 'https://lpwlbbowavozpywnpamn.supabase.co'

describe('observability log redaction policy', () => {
  beforeEach(() => {
    jsonMock.mockClear()
  })

  describe('ApiErrorHandler client-visible JSON responses', () => {
    // The non-validation error responders (everything except `badRequest` and
    // `fromZodError`) intentionally never echo a `details` field in the JSON
    // body sent to the client. Callers may pass details for server logs, but
    // the client-visible shape must stay `{error, code}` so secrets attached
    // to details cannot leak through the response surface.
    type NonValidationMethod =
      | 'unauthorized'
      | 'forbidden'
      | 'notFound'
      | 'methodNotAllowed'
      | 'tooManyRequests'
      | 'badGateway'
      | 'serviceUnavailable'
      | 'gatewayTimeout'

    const nonValidationResponders: Array<[NonValidationMethod, string, number]> = [
      ['unauthorized', 'UNAUTHORIZED', 401],
      ['forbidden', 'FORBIDDEN', 403],
      ['notFound', 'NOT_FOUND', 404],
      ['methodNotAllowed', 'METHOD_NOT_ALLOWED', 405],
      ['tooManyRequests', 'RATE_LIMITED', 429],
      ['badGateway', 'BAD_GATEWAY', 502],
      ['serviceUnavailable', 'SERVICE_UNAVAILABLE', 503],
      ['gatewayTimeout', 'GATEWAY_TIMEOUT', 504],
    ]

    const callResponder = (method: NonValidationMethod, message: string) => {
      switch (method) {
        case 'unauthorized':
          return ApiErrorHandler.unauthorized(message)
        case 'forbidden':
          return ApiErrorHandler.forbidden(message)
        case 'notFound':
          return ApiErrorHandler.notFound(message)
        case 'methodNotAllowed':
          return ApiErrorHandler.methodNotAllowed(message)
        case 'tooManyRequests':
          return ApiErrorHandler.tooManyRequests(message)
        case 'badGateway':
          return ApiErrorHandler.badGateway(message)
        case 'serviceUnavailable':
          return ApiErrorHandler.serviceUnavailable(message)
        case 'gatewayTimeout':
          return ApiErrorHandler.gatewayTimeout(message)
      }
    }

    it.each(nonValidationResponders)(
      '%s emits only {error, code} in the response body',
      (method, expectedCode, expectedStatus) => {
        callResponder(method, 'Standardized message')

        const lastCall = jsonMock.mock.calls.at(-1)
        if (!lastCall) throw new Error('expected jsonMock to be called')
        const [body, init] = lastCall
        expect(init?.status).toBe(expectedStatus)
        expect(body).toEqual({ error: 'Standardized message', code: expectedCode })
      }
    )

    it('serverError keeps details out of the JSON response body even when callers pass secret-shaped values', () => {
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      ApiErrorHandler.serverError('Internal failure', {
        serviceRoleKey: FAKE_SERVICE_ROLE_KEY,
        anonKey: FAKE_ANON_KEY,
        postgresUrl: `postgresql://postgres:${FAKE_POSTGRES_PASSWORD}@db.example:5432/postgres`,
        bearer: FAKE_BEARER,
        rawEnv: FAKE_ENV_VALUE,
      })

      const lastCall = jsonMock.mock.calls.at(-1)
      if (!lastCall) throw new Error('expected jsonMock to be called')
      const [body, init] = lastCall
      expect(init?.status).toBe(500)
      expect(body).toEqual({ error: 'Internal failure', code: 'SERVER_ERROR' })

      // The serialized JSON body must contain none of the secret-shaped
      // values, even transitively.
      const serialized = JSON.stringify(body)
      expect(serialized).not.toContain(FAKE_SERVICE_ROLE_KEY)
      expect(serialized).not.toContain(FAKE_ANON_KEY)
      expect(serialized).not.toContain(FAKE_POSTGRES_PASSWORD)
      expect(serialized).not.toContain(FAKE_BEARER)
      expect(serialized).not.toContain(FAKE_ENV_VALUE)

      errorSpy.mockRestore()
    })
  })

  describe('canonical pass-through logger contract', () => {
    // src/lib/utils.ts exports a thin `logger` that prefixes args and forwards
    // to the matching console method. The policy is: this logger is a
    // pass-through and does not perform redaction; callers MUST narrow error
    // payloads themselves (see `describeAuthError` in refresh-recovery.ts for
    // the canonical narrowing pattern). We guard the contract by asserting
    // the source contains no transformation of args before the console call.
    it('logger forwards args verbatim with a level prefix and performs no redaction itself', () => {
      const utilsSource = readFileSync(
        path.join(__dirname, '..', '..', '..', 'src', 'lib', 'utils.ts'),
        'utf8'
      )

      // Every level should be a single-statement arrow that prefixes args.
      expect(utilsSource).toMatch(
        /info: \(\.\.\.args: unknown\[\]\) => console\.log\('\[INFO\]', \.\.\.args\)/
      )
      expect(utilsSource).toMatch(
        /warn: \(\.\.\.args: unknown\[\]\) => console\.warn\('\[WARN\]', \.\.\.args\)/
      )
      expect(utilsSource).toMatch(
        /error: \(\.\.\.args: unknown\[\]\) => console\.error\('\[ERROR\]', \.\.\.args\)/
      )
    })
  })

  describe('instrumentation debug detail is development-only', () => {
    // src/instrumentation.ts emits boot markers via console.log. The policy
    // is that every such call must be guarded by
    // `if (process.env.NODE_ENV === 'development')` so production logs stay
    // free of debug noise. We assert this with a static scan rather than by
    // importing the file (which has top-level side effects in jsdom).
    it('every console.log site in instrumentation.ts is wrapped in a NODE_ENV === "development" gate', () => {
      const source = readFileSync(
        path.join(__dirname, '..', '..', '..', 'src', 'instrumentation.ts'),
        'utf8'
      )
      const lines = source.split('\n')

      const consoleLogLineNumbers: number[] = []
      lines.forEach((line, idx) => {
        if (/console\.log\s*\(/.test(line)) {
          consoleLogLineNumbers.push(idx)
        }
      })

      expect(consoleLogLineNumbers.length).toBeGreaterThan(0)

      const devGate =
        /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\)\s*\{/

      for (const lineIdx of consoleLogLineNumbers) {
        // Look back up to 3 nonblank lines for the dev gate. The current
        // shape places the gate immediately above the console.log call.
        const window = lines.slice(Math.max(0, lineIdx - 3), lineIdx).join('\n')
        expect(window).toMatch(devGate)
      }
    })

    it('instrumentation.ts contains no other console.* sinks that would bypass the dev gate', () => {
      const source = readFileSync(
        path.join(__dirname, '..', '..', '..', 'src', 'instrumentation.ts'),
        'utf8'
      )
      // Only console.log is permitted in this file; console.warn/error/info
      // would bypass the dev-only policy because the existing gate pattern
      // only wraps console.log calls.
      expect(source).not.toMatch(/console\.warn\s*\(/)
      expect(source).not.toMatch(/console\.error\s*\(/)
      expect(source).not.toMatch(/console\.info\s*\(/)
      expect(source).not.toMatch(/console\.debug\s*\(/)
    })
  })
})
