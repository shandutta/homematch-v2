/**
 * @jest-environment node
 */

import { readdirSync, statSync } from 'fs'
import { join, relative, sep } from 'path'

import {
  getRouteSideEffectPolicy,
  isAutonomousProbeAllowed,
  NO_AUTONOMOUS_PROBE_CATEGORIES,
  ROUTE_SIDE_EFFECT_POLICIES,
  type RouteSideEffectCategory,
} from '../../../src/lib/api/route-side-effect-policy'

const apiDir = join(process.cwd(), 'src/app/api')

function listRouteHandlerPaths(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) return listRouteHandlerPaths(fullPath)
    if (entry !== 'route.ts' && entry !== 'route.tsx') return []
    const rel = relative(apiDir, fullPath)
    const segments = rel.split(sep).slice(0, -1)
    return [`/api/${segments.join('/')}`]
  })
}

describe('API route side-effect policy', () => {
  test('every route handler under src/app/api has a policy entry', () => {
    const fsRoutes = listRouteHandlerPaths(apiDir).sort()
    const policyRoutes = ROUTE_SIDE_EFFECT_POLICIES.map(
      (policy) => policy.path
    ).sort()

    expect(policyRoutes).toEqual(fsRoutes)
  })

  test('policy paths are unique', () => {
    const seen = new Set<string>()
    for (const policy of ROUTE_SIDE_EFFECT_POLICIES) {
      expect(seen.has(policy.path)).toBe(false)
      seen.add(policy.path)
    }
  })

  test('every policy carries at least one category and a non-empty rationale', () => {
    for (const policy of ROUTE_SIDE_EFFECT_POLICIES) {
      expect(policy.categories.length).toBeGreaterThan(0)
      expect(policy.rationale.trim().length).toBeGreaterThan(0)
    }
  })

  test('paid/cron/notification/destructive routes are blocked from autonomous probes', () => {
    for (const policy of ROUTE_SIDE_EFFECT_POLICIES) {
      const blocked = policy.categories.some((category) =>
        NO_AUTONOMOUS_PROBE_CATEGORIES.has(category)
      )
      expect(isAutonomousProbeAllowed(policy.path)).toBe(!blocked)
    }
  })

  test('all paid/admin/notification surfaces are explicitly enumerated', () => {
    const requiredBlockedPaths: ReadonlyArray<{
      path: string
      category: RouteSideEffectCategory
    }> = [
      // Paid Google Maps surfaces — must never be hit without quota.
      { path: '/api/maps/geocode', category: 'paid-maps' },
      { path: '/api/maps/places/autocomplete', category: 'paid-maps' },
      { path: '/api/maps/script', category: 'paid-maps' },
      { path: '/api/maps/proxy-script', category: 'paid-maps' },
      // Paid RapidAPI / Zillow surfaces.
      { path: '/api/admin/ingest/zillow', category: 'paid-rapidapi' },
      { path: '/api/admin/status-refresh', category: 'paid-rapidapi' },
      { path: '/api/admin/generate-vibes-zillow', category: 'paid-rapidapi' },
      { path: '/api/zillow/random-image', category: 'paid-rapidapi' },
      // Paid LLM (OpenRouter) surfaces.
      { path: '/api/admin/generate-vibes', category: 'paid-llm' },
      { path: '/api/admin/generate-neighborhood-vibes', category: 'paid-llm' },
      { path: '/api/admin/generate-vibes-zillow', category: 'paid-llm' },
      // Cron-admin gating.
      { path: '/api/admin/generate-vibes', category: 'cron-admin' },
      {
        path: '/api/admin/generate-neighborhood-vibes',
        category: 'cron-admin',
      },
      { path: '/api/admin/generate-vibes-zillow', category: 'cron-admin' },
      { path: '/api/admin/ingest/zillow', category: 'cron-admin' },
      { path: '/api/admin/status-refresh', category: 'cron-admin' },
      // Notification fan-out.
      { path: '/api/couples/notify', category: 'notification' },
      // Bulk destructive.
      { path: '/api/interactions/reset', category: 'destructive-auth' },
    ]

    for (const { path, category } of requiredBlockedPaths) {
      const policy = getRouteSideEffectPolicy(path)
      expect(policy).toBeDefined()
      expect(policy?.categories).toContain(category)
      expect(isAutonomousProbeAllowed(path)).toBe(false)
    }
  })

  test('isAutonomousProbeAllowed returns false for unknown paths', () => {
    expect(isAutonomousProbeAllowed('/api/does-not-exist')).toBe(false)
    expect(isAutonomousProbeAllowed('/api/admin/future-llm-route')).toBe(false)
  })
})
