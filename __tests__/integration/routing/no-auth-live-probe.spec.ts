import { describe, expect, test } from 'vitest'

const RUN_LIVE_PROBES = process.env.NO_AUTH_LIVE_PROBES_RUN === '1'
const BASE_URL =
  process.env.NO_AUTH_LIVE_PROBES_BASE_URL || 'http://127.0.0.1:3000'

interface ProbeCase {
  path: string
  expectedStatuses: readonly number[]
  reason: string
}

const publicPageRoutes: ProbeCase[] = [
  { path: '/', expectedStatuses: [200], reason: 'public landing page' },
  { path: '/about', expectedStatuses: [200], reason: 'public about page' },
  {
    path: '/contact',
    expectedStatuses: [200],
    reason: 'public contact page; render only',
  },
  {
    path: '/cookies',
    expectedStatuses: [200],
    reason: 'public cookie preferences page',
  },
  {
    path: '/demo/ads',
    expectedStatuses: [200],
    reason: 'public demo page; render only',
  },
  {
    path: '/invite/synthetic-invalid-token',
    expectedStatuses: [200, 404],
    reason: 'synthetic invalid invite token only; no real invite data',
  },
  {
    path: '/login',
    expectedStatuses: [200],
    reason: 'public login form; no submit',
  },
  { path: '/privacy', expectedStatuses: [200], reason: 'public privacy page' },
  // /reset-password retired in Phase 4 of the Supabase-auth elimination
  // (2026-05-13) — Clerk owns password reset on its hosted pages.
  {
    path: '/signup',
    expectedStatuses: [200],
    reason: 'public signup form; no submit',
  },
  {
    path: '/sponsor-mockups',
    expectedStatuses: [200],
    reason: 'public sponsorship mockup page; render only',
  },
  { path: '/terms', expectedStatuses: [200], reason: 'public terms page' },
  // /verify-email and /auth/auth-code-error retired in Phase 4 of the
  // Supabase-auth elimination (2026-05-13) — Clerk owns email
  // verification and surfaces auth errors on its own hosted pages.
  {
    path: '/robots.txt',
    expectedStatuses: [200],
    reason: 'public metadata route',
  },
  {
    path: '/sitemap.xml',
    expectedStatuses: [200],
    reason: 'public metadata route',
  },
  {
    path: '/synthetic-missing-route-for-p0-no-auth-probe',
    expectedStatuses: [404],
    reason: 'synthetic not-found route only',
  },
]

const protectedPageRoutes: ProbeCase[] = [
  {
    path: '/dashboard',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected dashboard',
  },
  {
    path: '/dashboard/activity',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected activity page',
  },
  {
    path: '/dashboard/liked',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected liked page',
  },
  {
    path: '/dashboard/mutual-likes',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected mutual-likes page',
  },
  {
    path: '/dashboard/passed',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected passed page',
  },
  {
    path: '/dashboard/viewed',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected viewed page',
  },
  {
    path: '/dashboard/vibes-test',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected internal vibes page',
  },
  {
    path: '/profile',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected profile page',
  },
  {
    path: '/settings',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected settings page',
  },
  {
    path: '/household/create',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected household creation page',
  },
  {
    path: '/household/join',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected household join page',
  },
  {
    path: '/couples',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected couples page',
  },
  {
    path: '/couples/decisions',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected decisions page',
  },
  {
    path: '/properties/synthetic-property-id',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected synthetic property detail page',
  },
  {
    path: '/validation',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected validation page',
  },
  {
    path: '/couples?tab=activity',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected route with query preservation check',
  },
  {
    path: '/dashboard?tab=liked',
    expectedStatuses: [302, 303, 307, 308],
    reason: 'protected dashboard tab query preservation check',
  },
]

const publicApiRoutes: ProbeCase[] = [
  {
    path: '/api/health',
    expectedStatuses: [200],
    reason: 'safe public health endpoint',
  },
  {
    path: '/api/performance/metrics',
    expectedStatuses: [405],
    reason:
      'safe public API method-boundary check with GET only; no metric submission',
  },
  {
    path: '/api/properties/marketing',
    expectedStatuses: [200],
    reason:
      'safe public marketing endpoint returning a static mock card list; no auth, no external API call',
  },
]

const methodNotAllowedRoutes: ProbeCase[] = [
  {
    path: '/api/admin/generate-neighborhood-vibes',
    expectedStatuses: [405],
    reason:
      'POST-only admin route; GET hits the framework method boundary before any handler/secret/provider work',
  },
  {
    path: '/api/admin/generate-vibes-zillow',
    expectedStatuses: [405],
    reason:
      'POST-only admin route; GET hits the framework method boundary before any handler/secret/provider work',
  },
  {
    path: '/api/admin/status-refresh',
    expectedStatuses: [405],
    reason:
      'POST-only admin route; GET hits the framework method boundary before any handler/secret/provider work',
  },
  {
    path: '/api/admin/ingest/zillow',
    expectedStatuses: [405],
    reason:
      'POST-only admin route; GET hits the framework method boundary before any handler/secret/provider work',
  },
  {
    path: '/api/couples/notify',
    expectedStatuses: [405],
    reason:
      'POST-only user route; GET hits the framework method boundary before any handler work',
  },
  {
    path: '/api/interactions/reset',
    expectedStatuses: [405],
    reason:
      'DELETE-only user route; GET hits the framework method boundary before any handler work',
  },
  {
    path: '/api/users/avatar',
    expectedStatuses: [405],
    reason:
      'POST/DELETE-only user route; GET hits the framework method boundary before any handler work',
  },
]

const protectedApiDenyRoutes: ProbeCase[] = [
  {
    path: '/api/couples/activity?limit=1&offset=0',
    expectedStatuses: [401],
    reason: 'read-only user API should reject anonymous requests',
  },
  {
    path: '/api/couples/mutual-likes?includeProperties=false',
    expectedStatuses: [401],
    reason: 'read-only user API should reject anonymous requests',
  },
  {
    path: '/api/couples/stats',
    expectedStatuses: [401],
    reason: 'read-only user API should reject anonymous requests',
  },
  {
    path: '/api/couples/check-mutual?propertyId=synthetic-property-id',
    expectedStatuses: [401],
    reason: 'user API should reject anonymous requests before fixture lookup',
  },
  {
    path: '/api/couples/disputed',
    expectedStatuses: [401],
    reason: 'read-only disputed API should reject anonymous requests',
  },
  {
    path: '/api/interactions',
    expectedStatuses: [401],
    reason: 'read-only interactions list should reject anonymous requests',
  },
  {
    path: '/api/neighborhoods/vibes?neighborhood=synthetic',
    expectedStatuses: [401],
    reason: 'user API should reject anonymous requests before any AI/data work',
  },
  {
    path: '/api/properties/vibes?propertyId=synthetic-property-id',
    expectedStatuses: [401],
    reason: 'user API should reject anonymous requests before any AI/data work',
  },
  {
    path: '/api/users/search?q=synthetic',
    expectedStatuses: [401],
    reason: 'user search API should reject anonymous requests',
  },
  {
    path: '/api/admin/generate-vibes',
    expectedStatuses: [401],
    reason:
      'admin GET status route gates on cron secret before any DB/provider call; anonymous probe omits the secret',
  },
]

function assertLocalBaseUrl(baseUrl: string) {
  const url = new URL(baseUrl)
  const host = url.hostname.toLowerCase()
  expect(['127.0.0.1', 'localhost', '::1']).toContain(host)
}

async function probe(path: string, init?: RequestInit) {
  const url = new URL(path, BASE_URL)
  return fetch(url, {
    redirect: 'manual',
    ...init,
    headers: {
      accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      ...(init?.headers || {}),
    },
  })
}

describe.skipIf(!RUN_LIVE_PROBES)('P0 no-auth local live probe harness', () => {
  test('uses only a local app URL', () => {
    assertLocalBaseUrl(BASE_URL)
  })

  test.each(publicPageRoutes)(
    'loads public no-credential page $path: $reason',
    async ({ path, expectedStatuses }) => {
      const response = await probe(path)
      expect(expectedStatuses).toContain(response.status)
    }
  )

  test.each(protectedPageRoutes)(
    'redirects unauthenticated protected page $path to login: $reason',
    async ({ path, expectedStatuses }) => {
      const response = await probe(path)
      expect(expectedStatuses).toContain(response.status)
      const location = response.headers.get('location')
      expect(location).toBeTruthy()

      const redirectUrl = new URL(location!, BASE_URL)
      expect(redirectUrl.pathname).toBe('/login')
      expect(redirectUrl.searchParams.get('redirectTo')).toBe(path)
    }
  )

  test.each(publicApiRoutes)(
    'checks safe public API no-credential boundary $path: $reason',
    async ({ path, expectedStatuses }) => {
      const response = await probe(path, {
        headers: { accept: 'application/json' },
      })
      expect(expectedStatuses).toContain(response.status)
    }
  )

  test.each(protectedApiDenyRoutes)(
    'denies anonymous protected API $path: $reason',
    async ({ path, expectedStatuses }) => {
      const response = await probe(path, {
        headers: { accept: 'application/json' },
      })
      expect(expectedStatuses).toContain(response.status)
    }
  )

  test.each(methodNotAllowedRoutes)(
    'enforces method-not-allowed boundary on $path: $reason',
    async ({ path, expectedStatuses }) => {
      const response = await probe(path, {
        headers: { accept: 'application/json' },
      })
      expect(expectedStatuses).toContain(response.status)
    }
  )
})
