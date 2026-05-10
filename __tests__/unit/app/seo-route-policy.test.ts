/**
 * @jest-environment node
 */
// Phase 0/1 closure: P0-accessibility-core-flow

// Phase 0/1 closure: P0-accessibility-core-flow
import robots from '../../../src/app/robots'
import sitemap from '../../../src/app/sitemap'
import {
  SEO_PUBLIC_ROUTES,
  ROBOTS_DISALLOW_PATHS,
  LEGACY_PRIVATE_PREFIXES,
  REQUIRED_LEGAL_PUBLIC_PATHS,
  NOINDEX_PRIVATE_PATHS,
  isSeoPublicRoute,
  isRobotsDisallowedPath,
} from '../../../src/lib/seo/route-policy'
import { PROTECTED_PATH_PREFIXES } from '../../../src/lib/routing/protected-routes'

const pathFromUrl = (url: string) => new URL(url).pathname

describe('SEO route policy', () => {
  it('keeps sitemap entries on the shared public-only allowlist', () => {
    const sitemapPaths = sitemap().map((entry) => pathFromUrl(entry.url))

    expect(sitemapPaths).toEqual(SEO_PUBLIC_ROUTES.map((route) => route.path))
    for (const path of sitemapPaths) {
      expect(isSeoPublicRoute(path)).toBe(true)
      expect(isRobotsDisallowedPath(path)).toBe(false)
    }
  })

  it('stamps legal pages with their declared lastModified date', () => {
    const entries = sitemap()
    const byPath = new Map(
      entries.map((entry) => [pathFromUrl(entry.url), entry])
    )

    const expected = '2026-01-04'
    for (const path of ['/privacy', '/terms', '/cookies']) {
      const entry = byPath.get(path)
      expect(entry).toBeDefined()
      const stamp = entry!.lastModified
      expect(stamp).toBeInstanceOf(Date)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      expect((stamp as Date).toISOString().slice(0, 10)).toBe(expected)
    }
  })

  it('stamps dynamic pages with a recent lastModified close to now', () => {
    const entries = sitemap()
    const byPath = new Map(
      entries.map((entry) => [pathFromUrl(entry.url), entry])
    )

    const homepage = byPath.get('/')
    expect(homepage).toBeDefined()
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const stamp = homepage!.lastModified as Date
    const skewMs = Math.abs(Date.now() - stamp.getTime())
    expect(skewMs).toBeLessThan(60_000)
  })

  it('keeps protected application route prefixes excluded from robots', () => {
    for (const prefix of PROTECTED_PATH_PREFIXES) {
      expect(ROBOTS_DISALLOW_PATHS).toContain(prefix)
      expect(isRobotsDisallowedPath(prefix)).toBe(true)
      expect(isRobotsDisallowedPath(`${prefix}/nested`)).toBe(true)
    }
  })

  it('keeps auth, invite, internal, demo, api, and supabase surfaces excluded from robots', () => {
    const excludedPaths = [
      '/api',
      '/api/',
      '/auth',
      '/auth/',
      '/auth/callback',
      '/invite',
      '/invite/',
      '/invite/synthetic-token',
      '/demo',
      '/demo/',
      '/demo/ads',
      '/sponsor-mockups',
      '/sponsor-mockups/',
      '/supabase',
      '/supabase/',
      '/supabase/auth/v1/token',
    ]

    for (const path of excludedPaths) {
      expect(isRobotsDisallowedPath(path)).toBe(true)
    }
  })

  it('keeps legacy private prefixes (/account, /admin) excluded from robots', () => {
    for (const prefix of LEGACY_PRIVATE_PREFIXES) {
      expect(ROBOTS_DISALLOW_PATHS).toContain(prefix)
      expect(isRobotsDisallowedPath(prefix)).toBe(true)
      expect(isRobotsDisallowedPath(`${prefix}/nested`)).toBe(true)
    }
  })

  it('keeps no SEO public route inside the robots disallow list', () => {
    for (const route of SEO_PUBLIC_ROUTES) {
      expect(ROBOTS_DISALLOW_PATHS).not.toContain(route.path)
      expect(isRobotsDisallowedPath(route.path)).toBe(false)
    }
  })

  it('strips query strings and hash fragments before matching', () => {
    expect(isRobotsDisallowedPath('/dashboard?tab=matches')).toBe(true)
    expect(isRobotsDisallowedPath('/auth/callback#token=x')).toBe(true)
    expect(isRobotsDisallowedPath('/?ref=google')).toBe(false)
  })

  it('serves robots.txt from the shared policy', () => {
    const robotRules = robots().rules

    expect(robotRules).toMatchObject({
      userAgent: '*',
      allow: '/',
      disallow: ROBOTS_DISALLOW_PATHS,
    })
  })

  it('keeps legally required public surfaces (privacy, terms, cookies) in the SEO inventory', () => {
    const publicPaths = SEO_PUBLIC_ROUTES.map((route) => route.path)

    for (const requiredPath of REQUIRED_LEGAL_PUBLIC_PATHS) {
      expect(publicPaths).toContain(requiredPath)
      expect(isSeoPublicRoute(requiredPath)).toBe(true)
      expect(isRobotsDisallowedPath(requiredPath)).toBe(false)
    }
  })

  it('keeps noindex auth/token surfaces out of the public sitemap and SEO inventory', () => {
    const publicPaths = SEO_PUBLIC_ROUTES.map((route) => route.path)
    const sitemapPaths = sitemap().map((entry) => pathFromUrl(entry.url))

    for (const noindexPath of NOINDEX_PRIVATE_PATHS) {
      expect(publicPaths).not.toContain(noindexPath)
      expect(isSeoPublicRoute(noindexPath)).toBe(false)
      expect(sitemapPaths).not.toContain(noindexPath)
    }
  })
})
