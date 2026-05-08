/**
 * @jest-environment node
 */

import robots from '../../../src/app/robots'
import sitemap from '../../../src/app/sitemap'
import {
  SEO_PUBLIC_ROUTES,
  ROBOTS_DISALLOW_PATHS,
  LEGACY_PRIVATE_PREFIXES,
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
})
