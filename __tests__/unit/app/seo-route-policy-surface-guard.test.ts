/**
 * @jest-environment node
 *
 * Defensive surface-by-surface guard for robots/sitemap policy.
 *
 * The sibling `seo-route-policy.test.ts` walks the policy arrays in loops,
 * so deleting a critical entry (e.g. removing `/dashboard` from
 * PROTECTED_PATH_PREFIXES) would silently shrink the loop without failing.
 * This file enumerates the authenticated surfaces and internal preview
 * surfaces by name so a regression on any single one fails the suite.
 */
// Phase 0/1 closure: P0-accessibility-core-flow

import type { Metadata } from 'next'

import robots from '../../../src/app/robots'
import sitemap from '../../../src/app/sitemap'
import {
  ROBOTS_DISALLOW_PATHS,
  SEO_PUBLIC_ROUTES,
  isRobotsDisallowedPath,
  isSeoPublicRoute,
} from '../../../src/lib/seo/route-policy'

const REQUIRED_AUTHENTICATED_SURFACES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/couples',
  '/household',
  '/properties',
  '/validation',
  '/account',
  '/admin',
] as const

const REQUIRED_INTERNAL_PREVIEW_SURFACES = [
  '/sponsor-mockups',
  '/demo',
  '/demo/ads',
] as const

const INTERNAL_PREVIEW_PAGE_IMPORTS = [
  { route: '/sponsor-mockups', importPath: '@/app/sponsor-mockups/page' },
  { route: '/demo/ads', importPath: '@/app/demo/ads/page' },
] as const

describe('SEO route policy — per-surface guard', () => {
  it.each(REQUIRED_AUTHENTICATED_SURFACES)(
    'keeps authenticated surface %s out of robots indexing',
    (surface) => {
      expect(ROBOTS_DISALLOW_PATHS).toContain(surface)
      expect(isRobotsDisallowedPath(surface)).toBe(true)
      expect(isRobotsDisallowedPath(`${surface}/anything`)).toBe(true)
      expect(isRobotsDisallowedPath(`${surface}?ref=x`)).toBe(true)
      expect(isSeoPublicRoute(surface)).toBe(false)
    }
  )

  it.each(REQUIRED_INTERNAL_PREVIEW_SURFACES)(
    'keeps internal preview surface %s out of robots indexing',
    (surface) => {
      expect(isRobotsDisallowedPath(surface)).toBe(true)
      expect(isRobotsDisallowedPath(`${surface}/anything`)).toBe(true)
      expect(isSeoPublicRoute(surface)).toBe(false)
    }
  )

  it('keeps no SEO public route inside any protected/internal-preview surface', () => {
    const blockedSurfaces = [
      ...REQUIRED_AUTHENTICATED_SURFACES,
      ...REQUIRED_INTERNAL_PREVIEW_SURFACES,
    ]

    for (const route of SEO_PUBLIC_ROUTES) {
      for (const blocked of blockedSurfaces) {
        expect(route.path).not.toBe(blocked)
        expect(route.path.startsWith(`${blocked}/`)).toBe(false)
      }
    }
  })

  it('keeps the sitemap free of any protected or internal-preview surface', () => {
    const sitemapPaths = sitemap().map((entry) => new URL(entry.url).pathname)

    for (const path of sitemapPaths) {
      expect(isRobotsDisallowedPath(path)).toBe(false)
    }

    const blockedSurfaces = [
      ...REQUIRED_AUTHENTICATED_SURFACES,
      ...REQUIRED_INTERNAL_PREVIEW_SURFACES,
    ]
    for (const blocked of blockedSurfaces) {
      expect(sitemapPaths).not.toContain(blocked)
      expect(sitemapPaths.some((path) => path.startsWith(`${blocked}/`))).toBe(
        false
      )
    }
  })

  it('keeps robots.txt rules anchored to the shared disallow list', () => {
    const rules: { disallow?: string[] } = robots().rules
    expect(rules.disallow).toEqual(ROBOTS_DISALLOW_PATHS)
  })

  it.each(INTERNAL_PREVIEW_PAGE_IMPORTS)(
    'marks internal preview page $route as noindex via page metadata',
    async ({ importPath }) => {
      const mod: { metadata: Metadata } = await import(importPath)

      expect(mod.metadata.robots).toMatchObject({
        index: false,
        follow: false,
      })
      expect(mod.metadata.alternates).toBeUndefined()
      expect(mod.metadata.openGraph).toBeUndefined()
    }
  )
})
