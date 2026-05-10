// Phase 0/1 closure: P0-cron-secret-opacity
// Phase 0/1 closure: M5-route-limiter
/**
 * @jest-environment node
 *
 * Static guard locking in admin / health route method + auth policy:
 *
 *   1. Every admin POST handler authenticates with a *_CRON_SECRET before
 *      instantiating Supabase clients or invoking the route-scoped admin
 *      rate limiter (the limiter is keyed on IP, so running it before auth
 *      would let unauthenticated callers exhaust limiter slots).
 *   2. The single admin GET handler (generate-vibes) follows the same order.
 *   3. The /api/health route returns methodNotAllowed for every unsafe verb
 *      and never references secret env vars in its source (so its GET body
 *      cannot leak secrets or trigger side effects).
 */
// Phase 0/1 closure: M5-route-limiter
// Phase 0/1 closure: P0-cron-secret-opacity

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

const functionBody = (source: string, name: string): string => {
  const marker = `export async function ${name}`
  const start = source.indexOf(marker)
  if (start === -1) throw new Error(`Missing exported async function ${name}`)
  const next = source.indexOf('export async function ', start + marker.length)
  return source.slice(start, next === -1 ? undefined : next)
}

const ADMIN_POST_ROUTES = [
  {
    path: 'src/app/api/admin/generate-neighborhood-vibes/route.ts',
    secretEnv: 'VIBES_CRON_SECRET',
    rateLimitKey: 'admin:generate-neighborhood-vibes',
  },
  {
    path: 'src/app/api/admin/status-refresh/route.ts',
    secretEnv: 'STATUS_REFRESH_CRON_SECRET',
    rateLimitKey: 'admin:status-refresh',
  },
  {
    path: 'src/app/api/admin/generate-vibes-zillow/route.ts',
    secretEnv: 'VIBES_CRON_SECRET',
    rateLimitKey: 'admin:generate-vibes-zillow',
  },
  {
    path: 'src/app/api/admin/ingest/zillow/route.ts',
    secretEnv: 'ZILLOW_CRON_SECRET',
    rateLimitKey: 'admin:ingest-zillow',
  },
  {
    path: 'src/app/api/admin/generate-vibes/route.ts',
    secretEnv: 'VIBES_CRON_SECRET',
    rateLimitKey: 'admin:generate-vibes',
  },
] as const

describe('Admin route method + auth policy', () => {
  it.each(ADMIN_POST_ROUTES)(
    '$path POST authenticates before DB client + rate limiter',
    ({ path, secretEnv, rateLimitKey }) => {
      const source = read(path)
      const body = functionBody(source, 'POST')

      // Secret env reference present in the route source. Some routes hoist it
      // to a module constant so the handler body can stay small.
      expect(source).toContain(`process.env.${secretEnv}`)

      // Auth check must exist via shared helper.
      expect(body).toContain('ApiErrorHandler.unauthorized')

      // Rate limiter is invoked with the route-scoped key.
      expect(body).toContain('rateLimitAdminRoute(')
      expect(body).toContain(rateLimitKey)

      // Auth must precede the rate limiter (which is IP-keyed).
      const authIdx = body.indexOf('ApiErrorHandler.unauthorized')
      const limiterIdx = body.indexOf('rateLimitAdminRoute(')
      expect(authIdx).toBeGreaterThan(-1)
      expect(limiterIdx).toBeGreaterThan(-1)
      expect(authIdx).toBeLessThan(limiterIdx)

      // Auth must precede any Supabase client instantiation in this handler.
      const dbIdx = body.indexOf('createStandaloneClient(')
      if (dbIdx !== -1) {
        expect(authIdx).toBeLessThan(dbIdx)
      }
    }
  )

  it('admin generate-vibes GET authenticates before DB client + rate limiter', () => {
    const source = read('src/app/api/admin/generate-vibes/route.ts')
    const body = functionBody(source, 'GET')

    expect(body).toContain('process.env.VIBES_CRON_SECRET')
    expect(body).toContain('ApiErrorHandler.unauthorized')
    expect(body).toContain('rateLimitAdminRoute(')

    const authIdx = body.indexOf('ApiErrorHandler.unauthorized')
    const limiterIdx = body.indexOf('rateLimitAdminRoute(')
    const dbIdx = body.indexOf('createStandaloneClient(')

    expect(authIdx).toBeLessThan(limiterIdx)
    if (dbIdx !== -1) {
      expect(authIdx).toBeLessThan(dbIdx)
    }
  })
})

describe('Health route method gating + secret leakage guard', () => {
  const HEALTH_PATH = 'src/app/api/health/route.ts'

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s on /api/health returns methodNotAllowed',
    (method) => {
      const source = read(HEALTH_PATH)
      const body = functionBody(source, method)
      expect(body).toContain('ApiErrorHandler.methodNotAllowed()')
    }
  )

  it('health route source never embeds secret env vars (no leakage path)', () => {
    const source = read(HEALTH_PATH)
    const SECRET_ENVS = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENROUTER_API_KEY',
      'RAPIDAPI_KEY',
      'ZILLOW_CRON_SECRET',
      'VIBES_CRON_SECRET',
      'STATUS_REFRESH_CRON_SECRET',
      'GOOGLE_MAPS_SERVER_API_KEY',
    ] as const
    for (const env of SECRET_ENVS) {
      expect(source).not.toContain(env)
    }
  })

  it('health GET response shape excludes any process.env value', () => {
    const source = read(HEALTH_PATH)
    const body = functionBody(source, 'GET')

    // GET handler may read NODE_ENV / NEXT_PUBLIC_TEST_MODE for behavior, but
    // must never embed a process.env value in the response body.
    expect(body).not.toMatch(/NextResponse\.json\([^)]*process\.env/)
  })
})
