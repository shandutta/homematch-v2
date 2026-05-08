/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const route = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const functionBody = (source: string, name: string) => {
  const marker = `export async function ${name}`
  const start = source.indexOf(marker)
  if (start === -1) throw new Error(`Missing function ${name}`)
  const next = source.indexOf('export async function ', start + marker.length)
  return source.slice(start, next === -1 ? undefined : next)
}

describe('Phase 1 M5 route rate-limit coverage', () => {
  it.each([
    {
      path: 'src/app/api/couples/notify/route.ts',
      method: 'POST',
      key: 'couples:notify:${user.id}',
    },
    {
      path: 'src/app/api/couples/disputed/route.ts',
      method: 'PATCH',
      key: 'couples:disputed:${user.id}',
    },
    {
      path: 'src/app/api/interactions/route.ts',
      method: 'DELETE',
      key: 'interactions:delete:${user.id}',
    },
  ])(
    '$path $method uses route-scoped authenticated limiter',
    ({ path, method, key }) => {
      const source = route(path)
      const body = functionBody(source, method)

      expect(source).toContain('@/lib/utils/rate-limit')
      expect(body).toContain('apiRateLimiter.check')
      expect(body).toContain(key)
      expect(body).toMatch(/status: 429|ApiErrorHandler\.tooManyRequests/)
    }
  )

  it('rate-limits unauthenticated performance metrics ingestion by IP', () => {
    const source = route('src/app/api/performance/metrics/route.ts')
    const body = functionBody(source, 'POST')

    expect(source).toContain('@/lib/utils/rate-limit')
    expect(body).toContain('apiRateLimiter.check')
    expect(body).toContain('performance:metrics:')
    expect(body).toContain('x-forwarded-for')
    expect(body).toContain('status: 429')
  })
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
})
