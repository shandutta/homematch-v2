/**
 * @jest-environment node
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, posix, relative, sep } from 'path'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('Phase 1 M6 shared error standardization', () => {
  it('middleware rate limiter uses ApiErrorHandler for shared error responses', () => {
    const source = read('src/lib/middleware/rateLimiter.ts')

    expect(source).toContain('@/lib/api/errors')
    expect(source).toContain('ApiErrorHandler')
  })

  it('admin route limiter delegates to the shared standardized limiter', () => {
    const source = read('src/lib/api/admin-rate-limit.ts')

    expect(source).toContain('@/lib/middleware/rateLimiter')
    expect(source).toContain('checkRateLimit')
    expect(source).not.toContain(
      "NextResponse.json(\n    { error: 'Too many requests"
    )
  })

  it.each([
    'src/app/api/interactions/route.ts',
    'src/app/api/maps/geocode/route.ts',
    'src/app/api/maps/places/autocomplete/route.ts',
  ])('%s delegates 429 responses to the shared standardized limiter', (path) => {
    const source = read(path)

    expect(source).toContain('@/lib/middleware/rateLimiter')
    expect(source).toContain('checkRateLimit')
    expect(source).not.toContain(
      "NextResponse.json(\n        { error: 'Too many requests"
    )
  })

  it('shared rate limiter returns standardized 429 responses', () => {
    const source = read('src/lib/middleware/rateLimiter.ts')

    expect(source).toContain('ApiErrorHandler.tooManyRequests')
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

    expect(source).toContain('checkRateLimit')
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

  it.each([
    'src/app/api/maps/geocode/route.ts',
    'src/app/api/maps/places/autocomplete/route.ts',
  ])('%s standardizes paid Google Maps proxy errors', (path) => {
    const source = read(path)

    expect(source).toContain('checkRateLimit')
    expect(source).toContain('ApiErrorHandler.serviceUnavailable')
    expect(source).toContain('ApiErrorHandler.badRequest')
    expect(source).toContain('ApiErrorHandler.serverError')
    expect(source).not.toContain(
      "NextResponse.json(\n        { error: 'Too many requests"
    )
    expect(source).not.toContain(
      "NextResponse.json(\n        { error: 'Invalid request parameters"
    )
  })

  it.each([
    'src/app/api/couples/activity/route.ts',
    'src/app/api/couples/notify/route.ts',
    'src/app/api/couples/disputed/route.ts',
  ])('%s standardizes remaining couples route-family errors', (path) => {
    const source = read(path)

    expect(source).toContain('@/lib/api/errors')
    expect(source).toContain('ApiErrorHandler')
    expect(source).not.toContain("NextResponse.json({ error: 'Method not allowed' }")
    expect(source).not.toContain("NextResponse.json({ error: 'No household found' }")
    expect(source).not.toContain("{ error: 'Too many requests. Please try again later.' }")
    expect(source).not.toContain('NextResponse.json(\n        { error:')
    expect(source).not.toContain('NextResponse.json(\n      { error:')
  })

  it.each([
    'src/app/api/admin/status-refresh/route.ts',
    'src/app/api/admin/ingest/zillow/route.ts',
    'src/app/api/admin/generate-vibes/route.ts',
    'src/app/api/admin/generate-neighborhood-vibes/route.ts',
    'src/app/api/admin/generate-vibes-zillow/route.ts',
  ])('%s standardizes admin route-family errors', (path) => {
    const source = read(path)

    expect(source).toContain('@/lib/api/errors')
    expect(source).toContain('ApiErrorHandler')
    expect(source).not.toContain("NextResponse.json({ error: 'unauthorized cron' }")
    expect(source).not.toContain("NextResponse.json({ error: 'Unauthorized' }")
    expect(source).not.toContain("{ ok: false, error: 'Unauthorized' }")
    expect(source).not.toContain('NextResponse.json(\n        { error:')
    expect(source).not.toContain('NextResponse.json(\n      { error:')
    expect(source).not.toContain('NextResponse.json(\n      {\n        ok: false,')
  })

  it.each([
    'src/app/api/health/route.ts',
    'src/app/api/users/search/route.ts',
    'src/app/api/properties/marketing/route.ts',
    'src/app/api/performance/metrics/route.ts',
    'src/app/api/maps/script/route.ts',
    'src/app/api/maps/metro-boundaries/route.ts',
  ])('%s standardizes final JSON route-family errors', (path) => {
    const source = read(path)

    expect(source).toContain('@/lib/api/errors')
    expect(source).toContain('ApiErrorHandler')
    expect(source).not.toContain("NextResponse.json({ error: 'Method not allowed' }")
    expect(source).not.toContain("{ error: 'Too many requests. Please try again later.' }")
    expect(source).not.toContain('NextResponse.json(\n        { error:')
    expect(source).not.toContain('NextResponse.json(\n      { error:')
  })

  it.each([
    'src/app/api/interactions/reset/route.ts',
    'src/app/api/users/avatar/route.ts',
  ])(
    '%s keeps the user-interactions route-family on ApiErrorHandler with no raw NextResponse error envelopes',
    (path) => {
      const source = read(path)

      expect(source).toContain('@/lib/api/errors')
      expect(source).toContain('ApiErrorHandler')
      expect(source).not.toMatch(/NextResponse\.json\([^)]*\berror\s*:/)
      expect(source).not.toContain('NextResponse.json(\n        { error:')
      expect(source).not.toContain('NextResponse.json(\n      { error:')
      expect(source).not.toContain("NextResponse.json({ error: 'Unauthorized' }")
      expect(source).not.toContain("NextResponse.json({ error: 'Method not allowed' }")
    }
  )
})

// Routes whose response body is intentionally NOT JSON (they cannot return a
// JSON error envelope without breaking the caller contract). Errors are still
// shaped as the appropriate non-JSON content for the medium — for example,
// /api/maps/proxy-script is loaded via <script src="..."> and returns
// application/javascript stubs so the browser doesn't choke trying to execute
// a JSON body. Any addition to this set must come with a comment explaining
// why JSON is not viable.
const NON_JSON_DELIVERY_ROUTES = new Set<string>(['maps/proxy-script/route.ts'])

const API_ROOT = join(process.cwd(), 'src/app/api')

function listRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry)
    if (statSync(absolute).isDirectory()) {
      out.push(...listRouteFiles(absolute))
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      out.push(absolute)
    }
  }
  return out
}

function relativePosix(absolute: string): string {
  return relative(API_ROOT, absolute).split(sep).join(posix.sep)
}

function stripComments(source: string): string {
  // Remove block comments first, then line comments. The line-comment guard
  // skips `://` and similar inside string literals (best-effort — false
  // positives hurt more than false negatives in a static linter).
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
}

// Match a NextResponse.json or noStoreJson call whose argument list contains
// an explicit 4xx/5xx status: token. `[^()]{0,1500}` keeps the match inside a
// single call (parentheses bound the call args), and 1500 is generous enough
// to span any realistic response body.
const JSON_ERROR_STATUS_PATTERN =
  /(?:NextResponse\.json|noStoreJson)\s*\([^()]{0,1500}status:\s*[45]\d{2}/

const RAW_RESPONSE_ERROR_STATUS_PATTERN =
  /new\s+NextResponse\s*\([^()]{0,1500}status:\s*[45]\d{2}/

const ROUTE_FILES = listRouteFiles(API_ROOT)

describe('Phase 1 D17 raw JSON error envelope scanner (src/app/api)', () => {
  it('discovers every route handler under src/app/api', () => {
    expect(ROUTE_FILES.length).toBeGreaterThan(0)
    // Sanity: every documented non-JSON exception must actually exist on disk.
    for (const exception of NON_JSON_DELIVERY_ROUTES) {
      expect(ROUTE_FILES.map(relativePosix)).toContain(exception)
    }
  })

  it.each(ROUTE_FILES.map((absolute) => [relativePosix(absolute), absolute]))(
    '%s routes 4xx/5xx JSON responses through ApiErrorHandler',
    (_rel, absolute) => {
      const source = stripComments(readFileSync(absolute, 'utf8'))
      // Raw JSON error envelopes must go through ApiErrorHandler.* helpers so
      // every JSON API responds with the standard `{ error, code }` shape on
      // 400/401/403/404/413/429/500/502/503/504.
      expect(source).not.toMatch(JSON_ERROR_STATUS_PATTERN)
    }
  )

  it.each(
    ROUTE_FILES.map((absolute) => [relativePosix(absolute), absolute]).filter(
      ([rel]) => !NON_JSON_DELIVERY_ROUTES.has(rel)
    )
  )(
    '%s does not bypass JSON envelopes via raw new NextResponse(...) error responses',
    (_rel, absolute) => {
      const source = stripComments(readFileSync(absolute, 'utf8'))
      // Raw `new NextResponse(body, { status })` with a 4xx/5xx status would
      // skip the JSON envelope entirely. Only routes in
      // NON_JSON_DELIVERY_ROUTES are allowed to do this, and they must serve
      // an alternate content type (asserted below).
      expect(source).not.toMatch(RAW_RESPONSE_ERROR_STATUS_PATTERN)
    }
  )

  it('documented non-JSON delivery routes declare an alternate content type', () => {
    for (const rel of NON_JSON_DELIVERY_ROUTES) {
      const source = readFileSync(join(API_ROOT, rel), 'utf8')
      // The exception is justified only if the route really does serve a
      // non-JSON content type; otherwise the carve-out should be removed.
      expect(source).toMatch(
        /['"]Content-Type['"]\s*:\s*['"](?!application\/json)[^'"\s]+/
      )
    }
  })
})
