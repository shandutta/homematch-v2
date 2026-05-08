/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'
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

describe('user-specific GET routes cache policy', () => {
  const route = (path: string) =>
    readFileSync(join(process.cwd(), path), 'utf8')

  it.each([
    'src/app/api/couples/activity/route.ts',
    'src/app/api/couples/check-mutual/route.ts',
    'src/app/api/couples/disputed/route.ts',
    'src/app/api/couples/mutual-likes/route.ts',
    'src/app/api/couples/stats/route.ts',
    'src/app/api/interactions/route.ts',
    'src/app/api/neighborhoods/vibes/route.ts',
    'src/app/api/properties/vibes/route.ts',
    'src/app/api/users/search/route.ts',
    'src/app/api/admin/generate-vibes/route.ts',
    'src/app/api/maps/script/route.ts',
    'src/app/api/performance/metrics/route.ts',
    'src/app/api/zillow/random-image/route.ts',
  ])('%s returns successful dynamic JSON through noStoreJson', (path) => {
    const source = route(path)

    expect(source).toContain('@/lib/api/cache-control')
    expect(source).toContain('noStoreJson(')
  })

  it.each(['src/app/api/health/route.ts'])(
    '%s declares explicit no-store cache policy for health/status responses',
    (path) => {
      const source = route(path)

      expect(source).toContain('Cache-Control')
      expect(source).toContain('no-cache, no-store, must-revalidate')
    }
  )

  it.each([
    'src/app/api/maps/metro-boundaries/route.ts',
    'src/app/api/maps/proxy-script/route.ts',
  ])(
    '%s declares explicit public cache policy for public map assets',
    (path) => {
      const source = route(path)

      expect(source).toContain('Cache-Control')
      expect(source).toContain('public, max-age=3600')
    }
  )
})
