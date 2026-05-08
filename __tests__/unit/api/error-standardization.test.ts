/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('Phase 1 M6 shared error standardization', () => {
  it.each([
    'src/lib/api/admin-rate-limit.ts',
    'src/lib/middleware/rateLimiter.ts',
  ])('%s uses ApiErrorHandler for shared error responses', (path) => {
    const source = read(path)

    expect(source).toContain('@/lib/api/errors')
    expect(source).toContain('ApiErrorHandler')
  })

  it('admin route limiter returns standardized 429 responses', () => {
    const source = read('src/lib/api/admin-rate-limit.ts')

    expect(source).toContain('ApiErrorHandler.tooManyRequests')
    expect(source).not.toContain(
      "NextResponse.json(\n    { error: 'Too many requests"
    )
  })

  it('middleware rate limiter returns standardized 429, 401, and 500 responses', () => {
    const source = read('src/lib/middleware/rateLimiter.ts')

    expect(source).toContain('ApiErrorHandler.tooManyRequests')
    expect(source).toContain('ApiErrorHandler.unauthorized')
    expect(source).toContain('ApiErrorHandler.serverError')
  })
})

describe('Phase 1 M6 route error standardization', () => {
  it('fully standardizes the mixed interactions route', () => {
    const source = read('src/app/api/interactions/route.ts')

    expect(source).toContain('ApiErrorHandler.tooManyRequests')
    expect(source).toContain('ApiErrorHandler.gatewayTimeout')
    expect(source).not.toContain('NextResponse.json(\n        { error:')
    expect(source).not.toContain('NextResponse.json(\n      { error:')
  })

  it('zillow random-image avoids invalid 204 JSON bodies and uses standard error helpers', () => {
    const source = read('src/app/api/zillow/random-image/route.ts')

    expect(source).toContain('ApiErrorHandler.notFound')
    expect(source).toContain('ApiErrorHandler.serviceUnavailable')
    expect(source).toContain('ApiErrorHandler.badGateway')
    expect(source).not.toContain('status: 204')
    expect(source).not.toContain('NextResponse.json(\n      { error:')
  })

  it.each([
    'src/app/api/couples/check-mutual/route.ts',
    'src/app/api/couples/stats/route.ts',
    'src/app/api/couples/mutual-likes/route.ts',
    'src/app/api/neighborhoods/vibes/route.ts',
    'src/app/api/properties/vibes/route.ts',
  ])('%s standardizes auth/client/server route errors', (path) => {
    const source = read(path)

    expect(source).toContain('ApiErrorHandler')
    expect(source).not.toContain("NextResponse.json({ error: 'Unauthorized' }")
    expect(source).not.toContain('NextResponse.json(\n        { error:')
    expect(source).not.toContain('NextResponse.json(\n      { error:')
  })
})
