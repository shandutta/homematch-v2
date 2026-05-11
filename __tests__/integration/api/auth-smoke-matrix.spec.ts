import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const RUN_AUTH_SMOKE = process.env.API_AUTH_SMOKE_RUN === '1'
const TEST_API_URL = process.env.TEST_API_URL || 'http://127.0.0.1:3000'
const APPROVED_TEST_TOKEN = process.env.API_AUTH_SMOKE_TOKEN
const ALLOW_REMOTE = process.env.ALLOW_REMOTE_API_AUTH_SMOKE === '1'

const SPEC_SOURCE_PATH = path.resolve(__dirname, 'auth-smoke-matrix.spec.ts')
const SPEC_SOURCE = readFileSync(SPEC_SOURCE_PATH, 'utf8')

type ExpectedStatus = number | readonly number[]

interface SmokeCase {
  path: string
  reason: string
  anonymous: ExpectedStatus
  authenticated: ExpectedStatus
}

interface SkippedRoute {
  path: string
  reason: string
}

const protectedReadOnlyRoutes: SmokeCase[] = [
  {
    path: '/api/couples/activity?limit=1&offset=0',
    reason:
      'read-only household activity list; should return an empty activity array for seeded users without activity',
    anonymous: 401,
    authenticated: 200,
  },
  {
    path: '/api/couples/mutual-likes?includeProperties=false',
    reason:
      'read-only mutual-like list; includeProperties=false avoids extra property enrichment work',
    anonymous: 401,
    authenticated: 200,
  },
  {
    path: '/api/couples/stats',
    reason:
      'read-only household stats; 404 is acceptable for a seeded user without household stats',
    anonymous: 401,
    authenticated: [200, 404],
  },
]

const explicitlySkippedRoutes: SkippedRoute[] = [
  {
    path: '/api/maps/geocode',
    reason: 'paid/external Maps route; skipped to avoid paid Google API calls',
  },
  {
    path: '/api/maps/places/autocomplete',
    reason:
      'paid/external Places route; skipped to avoid paid Google API calls',
  },
  {
    path: '/api/maps/script',
    reason: 'external Maps script route; not part of handler-level auth proof',
  },
  {
    path: '/api/maps/proxy-script',
    reason: 'external Maps script proxy; not part of handler-level auth proof',
  },
  {
    path: '/api/properties/vibes',
    reason: 'AI/external-generation route; skipped to avoid paid LLM/API calls',
  },
  {
    path: '/api/neighborhoods/vibes',
    reason: 'AI/external-generation route; skipped to avoid paid LLM/API calls',
  },
  {
    path: '/api/admin/*',
    reason:
      'admin/service-secret route family; requires separate admin-secret authorization proof',
  },
  {
    path: '/api/interactions',
    reason: 'mutating interaction route; not safe for read-only smoke matrix',
  },
  {
    path: '/api/interactions/reset',
    reason: 'destructive reset route; not safe for read-only smoke matrix',
  },
  {
    path: '/api/users/avatar',
    reason: 'avatar upload/delete route; mutating and storage-backed',
  },
  {
    path: '/api/couples/notify',
    reason: 'notification route; may trigger side effects',
  },
]

function expectStatus(actual: number, expected: ExpectedStatus) {
  if (Array.isArray(expected)) {
    expect(expected).toContain(actual)
    return
  }

  expect(actual).toBe(expected)
}

function assertLocalOrApprovedRemote(baseUrl: string) {
  const url = new URL(baseUrl)
  const host = url.hostname.toLowerCase()
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1'

  if (!isLocal && !ALLOW_REMOTE) {
    throw new Error(
      `Refusing API auth smoke against non-local TEST_API_URL=${baseUrl}. Set ALLOW_REMOTE_API_AUTH_SMOKE=1 only for an explicitly approved non-production target.`
    )
  }
}

async function request(path: string, token?: string) {
  const url = new URL(path, TEST_API_URL)
  return fetch(url, {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  })
}

describe('P0/P1 API auth smoke matrix', () => {
  test('documents the bounded protected read-only routes under smoke', () => {
    expect(protectedReadOnlyRoutes.map((route) => route.path)).toEqual([
      '/api/couples/activity?limit=1&offset=0',
      '/api/couples/mutual-likes?includeProperties=false',
      '/api/couples/stats',
    ])
  })

  test('documents explicit skips for paid, external, mutating, and admin-secret routes', () => {
    expect(explicitlySkippedRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/api/maps/geocode' }),
        expect.objectContaining({ path: '/api/properties/vibes' }),
        expect.objectContaining({ path: '/api/admin/*' }),
        expect.objectContaining({ path: '/api/interactions' }),
      ])
    )
  })

  describe('static token/session safety guards', () => {
    test('refuses the live probe unless API_AUTH_SMOKE_RUN=1 is explicitly set', () => {
      expect(SPEC_SOURCE).toMatch(
        /process\.env\.API_AUTH_SMOKE_RUN\s*===\s*'1'/
      )
      expect(SPEC_SOURCE).toMatch(/test\.runIf\(RUN_AUTH_SMOKE\)/)
    })

    test('requires an explicit non-production bearer token via API_AUTH_SMOKE_TOKEN', () => {
      expect(SPEC_SOURCE).toMatch(/process\.env\.API_AUTH_SMOKE_TOKEN/)
      expect(SPEC_SOURCE).toMatch(
        /API_AUTH_SMOKE_TOKEN is required\. Use only an approved local seeded\/non-production test-user bearer token\./
      )
      expect(SPEC_SOURCE).toMatch(/if\s*\(\s*!APPROVED_TEST_TOKEN\s*\)/)
    })

    test('refuses non-local TEST_API_URL targets unless ALLOW_REMOTE is explicitly opted in', () => {
      expect(SPEC_SOURCE).toMatch(/assertLocalOrApprovedRemote\(TEST_API_URL\)/)
      expect(SPEC_SOURCE).toMatch(
        /Refusing API auth smoke against non-local TEST_API_URL/
      )
      expect(SPEC_SOURCE).toMatch(
        /Set ALLOW_REMOTE_API_AUTH_SMOKE=1 only for an explicitly approved non-production target/
      )
    })

    test('never logs the bearer token or the authorization header', () => {
      const consoleCalls = SPEC_SOURCE.match(/console\.[a-z]+\([^)]*\)/g) || []
      const tokenSurfaces = [
        'APPROVED_TEST_TOKEN',
        'API_AUTH_SMOKE_TOKEN',
        'process.env.API_AUTH_SMOKE_TOKEN',
        'authorization',
        'Authorization',
        'Bearer ',
        'access_token',
        'accessToken',
        'session.access_token',
      ]

      for (const call of consoleCalls) {
        for (const surface of tokenSurfaces) {
          expect(
            call,
            `console call must not reference ${surface}: ${call}`
          ).not.toContain(surface)
        }
      }
    })

    test('only attaches the bearer token to the outgoing fetch authorization header', () => {
      // The token must reach the wire only through the request() helper's
      // authorization header — never via a logger, error message, or response
      // body assertion.
      expect(SPEC_SOURCE).toMatch(
        /token\s*\?\s*\{\s*authorization:\s*`Bearer\s*\$\{token\}`\s*\}\s*:\s*undefined/
      )
      const requestCalls =
        SPEC_SOURCE.match(/request\([^)]*APPROVED_TEST_TOKEN[^)]*\)/g) || []
      expect(requestCalls).toHaveLength(1)
    })

    test('aggregates only path, anonymous status, authenticated status, and reason — never the token', () => {
      const resultsBlock = SPEC_SOURCE.match(/results\.push\(\{[\s\S]*?\}\)/)
      expect(resultsBlock).not.toBeNull()
      expect(resultsBlock![0]).toContain('path: route.path')
      expect(resultsBlock![0]).toContain('anonymous: anonymous.status')
      expect(resultsBlock![0]).toContain('authenticated: authenticated.status')
      expect(resultsBlock![0]).toContain('reason: route.reason')
      expect(resultsBlock![0]).not.toMatch(/token/i)
      expect(resultsBlock![0]).not.toMatch(/authorization/i)
      expect(resultsBlock![0]).not.toMatch(/bearer/i)
    })
  })

  test.skipIf(RUN_AUTH_SMOKE)(
    'skips the live probe by default so absent token/session inputs cannot trigger network calls',
    () => {
      expect(RUN_AUTH_SMOKE).toBe(false)
    }
  )

  test.runIf(RUN_AUTH_SMOKE)(
    'returns anonymous 401 and authenticated expected status for safe protected handlers',
    async () => {
      assertLocalOrApprovedRemote(TEST_API_URL)

      if (!APPROVED_TEST_TOKEN) {
        throw new Error(
          'API_AUTH_SMOKE_TOKEN is required. Use only an approved local seeded/non-production test-user bearer token.'
        )
      }

      const results = []
      for (const route of protectedReadOnlyRoutes) {
        const anonymous = await request(route.path)
        expectStatus(anonymous.status, route.anonymous)

        const authenticated = await request(route.path, APPROVED_TEST_TOKEN)
        expectStatus(authenticated.status, route.authenticated)

        results.push({
          path: route.path,
          anonymous: anonymous.status,
          authenticated: authenticated.status,
          reason: route.reason,
        })
      }

      console.info(
        'P0/P1 API auth smoke matrix results:',
        JSON.stringify(results)
      )
    },
    60_000
  )
})
