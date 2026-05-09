/**
 * @jest-environment node
 */
// Phase 0/1 closure: P1-cache-policy-classification

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, sep, posix } from 'path'
import { noStoreJson } from '@/lib/api/cache-control'

describe('API cache-control helpers', () => {
  it('marks user-specific JSON responses as private no-store', async () => {
    const response = noStoreJson({ ok: true })

    expect(response.headers.get('Cache-Control')).toBe(
      'private, no-store, no-cache, must-revalidate, max-age=0'
    )
    expect(await response.json()).toEqual({ ok: true })
  })

  it('preserves status and merges caller headers', () => {
    const response = noStoreJson(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'X-Test': 'yes' } }
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('X-Test')).toBe('yes')
    expect(response.headers.get('Cache-Control')).toBe(
      'private, no-store, no-cache, must-revalidate, max-age=0'
    )
  })
})

const NO_STORE_GET_ROUTES = [
  'src/app/api/admin/generate-vibes/route.ts',
  'src/app/api/couples/activity/route.ts',
  'src/app/api/couples/check-mutual/route.ts',
  'src/app/api/couples/disputed/route.ts',
  'src/app/api/couples/mutual-likes/route.ts',
  'src/app/api/couples/stats/route.ts',
  'src/app/api/interactions/route.ts',
  'src/app/api/maps/script/route.ts',
  'src/app/api/neighborhoods/vibes/route.ts',
  'src/app/api/performance/metrics/route.ts',
  'src/app/api/properties/vibes/route.ts',
  'src/app/api/users/search/route.ts',
  'src/app/api/zillow/random-image/route.ts',
] as const

const NO_CACHE_GET_ROUTES = ['src/app/api/health/route.ts'] as const

const PUBLIC_CACHED_GET_ROUTES = [
  'src/app/api/maps/metro-boundaries/route.ts',
  'src/app/api/maps/proxy-script/route.ts',
  'src/app/api/properties/marketing/route.ts',
] as const

describe('user-specific GET routes cache policy', () => {
  const route = (path: string) =>
    readFileSync(join(process.cwd(), path), 'utf8')

  it.each(NO_STORE_GET_ROUTES)(
    '%s returns successful dynamic JSON through noStoreJson',
    (path) => {
      const source = route(path)

      expect(source).toContain('@/lib/api/cache-control')
      expect(source).toContain('noStoreJson(')
    }
  )

  it.each(NO_STORE_GET_ROUTES)(
    '%s does not accidentally declare a public/max-age cache directive',
    (path) => {
      const source = route(path)

      expect(source).not.toMatch(/public,\s*max-age/i)
    }
  )

  it.each(NO_CACHE_GET_ROUTES)(
    '%s declares explicit no-store cache policy for health/status responses',
    (path) => {
      const source = route(path)

      expect(source).toContain('Cache-Control')
      expect(source).toContain('no-cache, no-store, must-revalidate')
    }
  )

  it.each(PUBLIC_CACHED_GET_ROUTES)(
    '%s declares explicit public cache policy for public assets',
    (path) => {
      const source = route(path)

      expect(source).toContain('Cache-Control')
      expect(source).toMatch(/public,\s*max-age=\d+/i)
    }
  )
})

describe('GET route cache policy classification matrix', () => {
  const apiRoot = join(process.cwd(), 'src/app/api')

  function discoverGetRouteFiles(): string[] {
    const results: string[] = []
    const stack = [apiRoot]
    while (stack.length > 0) {
      const dir = stack.pop()!
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry)
        if (statSync(fullPath).isDirectory()) {
          stack.push(fullPath)
        } else if (entry === 'route.ts') {
          const source = readFileSync(fullPath, 'utf8')
          const exportsGet =
            /\bexport\s+(?:async\s+)?function\s+GET\b/.test(source) ||
            /\bexport\s+const\s+GET\b/.test(source)
          if (exportsGet) {
            results.push(
              relative(process.cwd(), fullPath).split(sep).join(posix.sep)
            )
          }
        }
      }
    }
    return results.sort()
  }

  const classifiedRoutes = new Set<string>([
    ...NO_STORE_GET_ROUTES,
    ...NO_CACHE_GET_ROUTES,
    ...PUBLIC_CACHED_GET_ROUTES,
  ])

  it('classifies every GET route handler under src/app/api', () => {
    const discovered = discoverGetRouteFiles()

    const unclassified = discovered.filter(
      (path) => !classifiedRoutes.has(path)
    )
    expect(unclassified).toEqual([])

    const stale = Array.from(classifiedRoutes).filter(
      (path) => !discovered.includes(path)
    )
    expect(stale).toEqual([])
  })

  it('does not double-classify any GET route', () => {
    const counts = new Map<string, number>()
    for (const list of [
      NO_STORE_GET_ROUTES,
      NO_CACHE_GET_ROUTES,
      PUBLIC_CACHED_GET_ROUTES,
    ]) {
      for (const path of list) {
        counts.set(path, (counts.get(path) ?? 0) + 1)
      }
    }
    const duplicates = Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([path]) => path)
    expect(duplicates).toEqual([])
  })
})
