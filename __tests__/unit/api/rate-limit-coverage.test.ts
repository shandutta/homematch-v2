/**
 * @jest-environment node
 */
// Phase 0/1 closure: M5-route-limiter

import { readFileSync } from 'fs'
import { join } from 'path'

const route = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const functionBody = (source: string, name: string) => {
  const markers = [`export async function ${name}`, `export const ${name}`]
  const marker = markers.find((candidate) => source.includes(candidate))
  if (!marker) throw new Error(`Missing function ${name}`)
  const start = source.indexOf(marker)
  const nextFunction = source.indexOf(
    'export async function ',
    start + marker.length
  )
  const nextConst = source.indexOf('export const ', start + marker.length)
  const candidates = [nextFunction, nextConst].filter((idx) => idx !== -1)
  const next = candidates.length ? Math.min(...candidates) : -1
  return source.slice(start, next === -1 ? undefined : next)
}

describe('Phase 1 M5 route rate-limit coverage', () => {
  it.each([
    {
      path: 'src/app/api/couples/notify/route.ts',
      method: 'POST',
      key: "rateLimitKey('couples:notify', user.id)",
    },
    {
      path: 'src/app/api/couples/disputed/route.ts',
      method: 'PATCH',
      key: "rateLimitKey('couples:disputed', user.id)",
    },
    {
      path: 'src/app/api/interactions/route.ts',
      method: 'DELETE',
      key: "rateLimitKey('interactions:delete', user.id)",
    },
  ])(
    '$path $method uses route-scoped authenticated limiter',
    ({ path, method, key }) => {
      const source = route(path)
      const body = functionBody(source, method)

      expect(source).toContain('@/lib/middleware/rateLimiter')
      expect(body).toContain('checkRateLimit')
      expect(body).toContain(key)
      expect(body).toMatch(/rateLimitResponse\) return rateLimitResponse/)
    }
  )

  it('rate-limits unauthenticated performance metrics ingestion by IP', () => {
    const source = route('src/app/api/performance/metrics/route.ts')
    const body = functionBody(source, 'POST')

    expect(source).toContain('@/lib/middleware/rateLimiter')
    expect(body).toContain('checkRateLimit')
    expect(body).toContain("rateLimitKey('performance:metrics', ip)")
    expect(body).toContain('x-forwarded-for')
    expect(body).toMatch(/rateLimitResponse\) return rateLimitResponse/)
  })
})

describe('Phase 1 route-scoped rate-limit key closure', () => {
  it.each([
    {
      path: 'src/app/api/users/search/route.ts',
      method: 'GET',
      key: "rateLimitKey('users:search', auth.user.id)",
    },
    {
      path: 'src/app/api/maps/geocode/route.ts',
      method: 'POST',
      key: "rateLimitKey('maps:geocode', auth.user.id)",
    },
    {
      path: 'src/app/api/maps/places/autocomplete/route.ts',
      method: 'POST',
      key: "rateLimitKey('maps:places:autocomplete', auth.user.id)",
    },
    {
      path: 'src/app/api/interactions/reset/route.ts',
      method: 'DELETE',
      key: "rateLimitKey('interactions:reset', user.id)",
    },
    {
      path: 'src/app/api/interactions/route.ts',
      method: 'POST',
      key: "rateLimitKey('interactions:create', user.id)",
    },
  ])(
    '$path $method uses shared route-scoped key helper',
    ({ path, method, key }) => {
      const source = route(path)
      const body = functionBody(source, method)

      expect(source).toContain('rateLimitKey')
      expect(body).toContain(key)
    }
  )
})

describe('Phase 1 M5 admin cron route rate-limit coverage', () => {
  it.each([
    {
      path: 'src/app/api/admin/status-refresh/route.ts',
      key: 'admin:status-refresh',
    },
    {
      path: 'src/app/api/admin/ingest/zillow/route.ts',
      key: 'admin:ingest-zillow',
    },
    {
      path: 'src/app/api/admin/generate-vibes/route.ts',
      key: 'admin:generate-vibes',
    },
    {
      path: 'src/app/api/admin/generate-neighborhood-vibes/route.ts',
      key: 'admin:generate-neighborhood-vibes',
    },
    {
      path: 'src/app/api/admin/generate-vibes-zillow/route.ts',
      key: 'admin:generate-vibes-zillow',
    },
  ])('$path applies route-scoped admin cron limiter', ({ path, key }) => {
    const source = route(path)

    expect(source).toContain('@/lib/api/admin-rate-limit')
    expect(source).toContain('rateLimitAdminRoute(')
    expect(source).toContain(key)
  })

  it('admin cron limiter derives keys through the shared route-scoped helper', () => {
    const source = route('src/lib/api/admin-rate-limit.ts')

    expect(source).toContain('rateLimitKey')
    expect(source).toContain('rateLimitKey(routeKey, getRequestIp(request))')
  })
})
