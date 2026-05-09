/**
 * @jest-environment node
 */
// Phase 0/1 closure: P1-middleware-matchers

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  config as rootConfig,
  middleware as rootMiddleware,
  buildSupabaseSessionCookieOptions as rootCookieOptions,
} from '../../../middleware'
import {
  config as srcConfig,
  middleware as srcMiddleware,
  buildSupabaseSessionCookieOptions as srcCookieOptions,
} from '../../../src/middleware'
import { isProtectedPath } from '../../../src/lib/routing/protected-routes'

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

const buildMatcherRegex = (pattern: string) => new RegExp(`^${pattern}$`)

describe('Next 15 middleware proxy guard', () => {
  describe('src/middleware.ts proxy re-export', () => {
    it('re-exports middleware, config, and buildSupabaseSessionCookieOptions from the root middleware module so Next 15 picks up the src-directory entrypoint', () => {
      const source = readSource('src/middleware.ts')

      expect(source).toMatch(/from\s+['"]\.\.\/middleware['"]/)
      expect(source).toContain('middleware')
      expect(source).toContain('config')
      expect(source).toContain('buildSupabaseSessionCookieOptions')
    })

    it('shares identical references between src/middleware.ts and the root middleware so request interception cannot diverge', () => {
      expect(srcMiddleware).toBe(rootMiddleware)
      expect(srcConfig).toBe(rootConfig)
      expect(srcCookieOptions).toBe(rootCookieOptions)
    })
  })

  describe('matcher coverage for protected route prefixes', () => {
    const matcherPattern = rootConfig.matcher[0]
    const matcherRegex = buildMatcherRegex(matcherPattern)

    it.each([
      '/dashboard',
      '/dashboard/',
      '/dashboard/liked',
      '/dashboard/activity',
      '/couples',
      '/couples/',
      '/couples/decisions',
      '/couples?tab=activity',
    ])(
      'keeps protected path %s inside the Next 15 middleware matcher so the auth guard runs',
      (pathname) => {
        // The matcher only sees the URL path, not the query string. Strip
        // search params so we mirror what Next 15 hands the matcher engine.
        const pathOnly = pathname.split('?')[0]
        expect(matcherRegex.test(pathOnly)).toBe(true)
      }
    )

    it.each([
      '/_next/static/chunks/main.js',
      '/_next/image/foo.png',
      '/_next/data/build/index.json',
      '/favicon.ico',
      '/icon.svg',
      '/app.css',
      '/bundle.js',
      '/manifest.json',
      '/robots.txt',
      '/sitemap.xml',
      '/font.woff2',
    ])(
      'keeps static asset path %s outside the Next 15 middleware matcher so we never run auth on assets',
      (pathname) => {
        expect(matcherRegex.test(pathname)).toBe(false)
      }
    )

    it('aligns matcher coverage with isProtectedPath so middleware actually intercepts /dashboard and /couples', () => {
      for (const pathname of ['/dashboard', '/dashboard/liked', '/couples', '/couples/decisions']) {
        expect(matcherRegex.test(pathname)).toBe(true)
        expect(isProtectedPath(pathname)).toBe(true)
      }
    })
  })

  describe('protected path prefix coverage', () => {
    it('keeps /dashboard and /couples in the protected path prefix list so the middleware redirects unauthenticated requests', () => {
      expect(isProtectedPath('/dashboard')).toBe(true)
      expect(isProtectedPath('/dashboard/liked')).toBe(true)
      expect(isProtectedPath('/couples')).toBe(true)
      expect(isProtectedPath('/couples/decisions')).toBe(true)
    })
  })
})
