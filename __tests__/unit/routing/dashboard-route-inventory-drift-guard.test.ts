/**
 * @jest-environment node
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, posix, sep } from 'node:path'
import { isProtectedPath } from '../../../src/lib/routing/protected-routes'

type RouteClassification = 'protected' | 'public' | 'side-effect'

type DashboardRouteExpectation = {
  path: string
  reportPath?: string
  classification: RouteClassification
}

// Explicit, in-test manifest. New /dashboard pages must be added here with an
// explicit classification before this guard will pass — that is the drift
// signal. Bumping this list silently is the bug we want to surface.
const dashboardRouteManifest: DashboardRouteExpectation[] = [
  { path: '/dashboard', classification: 'protected' },
  { path: '/dashboard/activity', classification: 'protected' },
  { path: '/dashboard/liked', classification: 'protected' },
  { path: '/dashboard/mutual-likes', classification: 'protected' },
  { path: '/dashboard/passed', classification: 'protected' },
  { path: '/dashboard/viewed', classification: 'protected' },
  { path: '/dashboard/vibes-test', classification: 'protected' },
]

const dashboardAppDir = join(process.cwd(), 'src', 'app', 'dashboard')

const inventoryMatrixPath =
  'reports/home-match-revival/p0-full-route-api-endpoint-inventory-matrix-2026-05-08.md'

const isRouteGroupSegment = (segment: string) =>
  segment.startsWith('(') && segment.endsWith(')')

const segmentToUrlSegment = (segment: string): string => {
  if (segment.startsWith('[...') && segment.endsWith(']')) {
    return `:${segment.slice(4, -1)}*`
  }
  if (segment.startsWith('[[...') && segment.endsWith(']]')) {
    return `:${segment.slice(5, -2)}?`
  }
  if (segment.startsWith('[') && segment.endsWith(']')) {
    return `:${segment.slice(1, -1)}`
  }
  return segment
}

const discoverPagePaths = (rootDir: string): string[] => {
  const results: string[] = []

  const walk = (currentDir: string) => {
    for (const entry of readdirSync(currentDir)) {
      const entryPath = join(currentDir, entry)
      const entryStat = statSync(entryPath)
      if (entryStat.isDirectory()) {
        walk(entryPath)
        continue
      }
      if (entry !== 'page.tsx' && entry !== 'page.ts') continue

      const relativeFromAppRoot = entryPath
        .slice(join(process.cwd(), 'src', 'app').length)
        .split(sep)
        .filter(Boolean)
        .slice(0, -1) // drop the page.tsx file segment
        .filter((segment) => !isRouteGroupSegment(segment))
        .map(segmentToUrlSegment)

      results.push('/' + relativeFromAppRoot.join(posix.sep))
    }
  }

  walk(rootDir)
  return results.sort()
}

describe('dashboard route inventory drift guard', () => {
  const discoveredDashboardPages = discoverPagePaths(dashboardAppDir)

  it('classifies every on-disk /dashboard page in the explicit manifest', () => {
    const manifestPaths = new Set(
      dashboardRouteManifest.map((route) => route.path)
    )
    const unclassified = discoveredDashboardPages.filter(
      (path) => !manifestPaths.has(path)
    )
    expect(unclassified).toEqual([])

    const stale = dashboardRouteManifest
      .map((route) => route.path)
      .filter((path) => !discoveredDashboardPages.includes(path))
    expect(stale).toEqual([])
  })

  it('keeps every classified /dashboard route consistent with middleware protection', () => {
    for (const route of dashboardRouteManifest) {
      if (route.classification === 'protected') {
        expect(isProtectedPath(route.path)).toBe(true)
      } else {
        expect(isProtectedPath(route.path)).toBe(false)
      }
    }
  })

  it('keeps every classified /dashboard route documented in the P0 inventory matrix', () => {
    const matrix = readFileSync(join(process.cwd(), inventoryMatrixPath), 'utf8')
    for (const route of dashboardRouteManifest) {
      expect(matrix).toContain(route.reportPath ?? route.path)
    }
  })
})
