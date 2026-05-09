/**
 * @jest-environment node
 *
 * Guard: API error/debug responses must never include raw env values,
 * service-role keys, tokens, or credential-looking strings — even when
 * a route passes mistake-prone data into an error helper.
 *
 * - Behavioral: locks in the redaction contract for ApiErrorHandler so
 *   `serverError(msg, details)` never echoes `details` into the body.
 * - Static: scans `src/app/api/** /route.ts` for known response-leak shapes
 *   (process.env in response bodies, Error.stack echoed back, etc.).
 */
// Phase 0/1 closure: D7-disputed-route-exposure

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals'
import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'
import { ApiErrorHandler } from '@/lib/api/errors'

const findRouteFiles = (root: string): string[] => {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile() && entry.name === 'route.ts') {
        out.push(full)
      }
    }
  }
  walk(root)
  return out
}

type JsonInit = { status?: number; headers?: HeadersInit }
const jsonMock = jest.fn((body: unknown, init?: JsonInit) => ({
  status: init?.status ?? 200,
  body,
}))

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (...args: unknown[]) => jsonMock(...args),
  },
}))

const SYNTHETIC_SECRET =
  '__synthetic_test_secret_eyJhbGciOiJIUzI1NiJ9.DO_NOT_LEAK__'
const SYNTHETIC_SERVICE_ROLE =
  'sb_synthetic_service_role_key_redaction_guard_xyz123'
const SYNTHETIC_BEARER = 'Bearer synthetic.jwt.signature_for_redaction_guard'

const lastBody = (): unknown => {
  const calls = jsonMock.mock.calls
  if (calls.length === 0) {
    throw new Error('NextResponse.json was not called')
  }
  return calls[calls.length - 1][0]
}

const stringifyBody = (): string => JSON.stringify(lastBody())

describe('ApiErrorHandler redaction contract', () => {
  const originalEnv = { ...process.env }
  let errorSpy: ReturnType<typeof jest.spyOn>

  beforeEach(() => {
    jsonMock.mockClear()
    process.env.SUPABASE_SERVICE_ROLE_KEY = SYNTHETIC_SERVICE_ROLE
    process.env.RAPIDAPI_KEY = SYNTHETIC_SECRET
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
    process.env = { ...originalEnv }
  })

  it('serverError never echoes details into the response body', () => {
    ApiErrorHandler.serverError('Boom', {
      secret: SYNTHETIC_SECRET,
      serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: SYNTHETIC_BEARER,
      env: process.env,
    })

    const body = stringifyBody()
    expect(body).not.toContain(SYNTHETIC_SECRET)
    expect(body).not.toContain(SYNTHETIC_SERVICE_ROLE)
    expect(body).not.toContain(SYNTHETIC_BEARER)
    expect(lastBody()).toEqual({ error: 'Boom', code: 'SERVER_ERROR' })
  })

  it('serverError logs details server-side but keeps the response body redacted', () => {
    const leaky = { token: SYNTHETIC_SECRET }
    ApiErrorHandler.serverError('Boom', leaky)

    expect(errorSpy).toHaveBeenCalledWith('Server error:', 'Boom', leaky)
    expect(stringifyBody()).not.toContain(SYNTHETIC_SECRET)
  })

  it.each([
    ['unauthorized'],
    ['forbidden'],
    ['notFound'],
    ['methodNotAllowed'],
    ['tooManyRequests'],
    ['badGateway'],
    ['serviceUnavailable'],
    ['gatewayTimeout'],
  ] as const)(
    '%s never includes process.env or details fields in the body',
    (method) => {
      ApiErrorHandler[method]('Standardized error')

      const body = lastBody()
      expect(body).not.toHaveProperty('details')
      expect(body).not.toHaveProperty('stack')
      expect(body).not.toHaveProperty('env')
      expect(stringifyBody()).not.toContain(SYNTHETIC_SECRET)
      expect(stringifyBody()).not.toContain(SYNTHETIC_SERVICE_ROLE)
    }
  )

  it('errors.ts source does not pass details into the serverError JSON body', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/api/errors.ts'),
      'utf8'
    )

    const serverErrorBlock = source.match(
      /static serverError\([\s\S]*?\n\s{2}\}/
    )?.[0]

    expect(serverErrorBlock).toBeDefined()
    expect(serverErrorBlock).not.toMatch(/NextResponse\.json\([^)]*details/)
  })
})

describe('API route response redaction (static guard)', () => {
  const routes = findRouteFiles(
    join(process.cwd(), 'src/app/api')
  ).map((p) => relative(process.cwd(), p))

  it('discovers route files to scan', () => {
    expect(routes.length).toBeGreaterThan(0)
  })

  it.each(routes)(
    '%s does not embed process.env values in response bodies',
    (file) => {
      const source = readFileSync(join(process.cwd(), file), 'utf8')

      // Forbid process.env appearing as part of a NextResponse.json body
      // argument. Reading process.env into a local for use in logic is fine.
      expect(source).not.toMatch(/NextResponse\.json\(\s*\{[^}]*process\.env/s)
      expect(source).not.toMatch(
        /NextResponse\.json\(\s*\{[^}]*JSON\.stringify\(\s*process\.env/s
      )
    }
  )

  it.each(routes)(
    '%s does not echo Error.stack inside a response body',
    (file) => {
      const source = readFileSync(join(process.cwd(), file), 'utf8')

      // Allow stack: inside console.error / console.warn calls; forbid
      // stack: keys appearing inside a NextResponse.json body argument.
      const responseBlocks = source.match(
        /NextResponse\.json\(\s*\{[\s\S]*?\}\s*[,)]/g
      )
      if (!responseBlocks) return

      for (const block of responseBlocks) {
        expect(block).not.toMatch(/\bstack\s*:/)
      }
    }
  )

  it.each(routes)(
    '%s does not return raw error objects via NextResponse.json',
    (file) => {
      const source = readFileSync(join(process.cwd(), file), 'utf8')

      // Catch shapes like `NextResponse.json({ error: err }, ...)` or
      // `NextResponse.json({ details: err }, ...)` where `err` is the raw
      // caught Error — these are common credential-leak vectors via
      // err.message / err.cause / err.stack.
      expect(source).not.toMatch(
        /NextResponse\.json\(\s*\{\s*[^}]*\b(?:error|details)\s*:\s*err\s*[,}]/
      )
      expect(source).not.toMatch(
        /NextResponse\.json\(\s*\{\s*[^}]*\b(?:error|details)\s*:\s*e\s*[,}]/
      )
    }
  )

  it.each(routes)(
    '%s does not echo Authorization or Cookie headers in a response body',
    (file) => {
      const source = readFileSync(join(process.cwd(), file), 'utf8')

      const responseBlocks = source.match(
        /NextResponse\.json\(\s*\{[\s\S]*?\}\s*[,)]/g
      )
      if (!responseBlocks) return

      for (const block of responseBlocks) {
        expect(block).not.toMatch(
          /headers?\.get\(\s*['"](?:authorization|cookie)['"]/i
        )
      }
    }
  )
})
