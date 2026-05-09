/** @jest-environment node */

import { readFileSync } from 'fs'
import { join } from 'path'

const ADMIN_ROUTES = [
  'src/app/api/admin/status-refresh/route.ts',
  'src/app/api/admin/ingest/zillow/route.ts',
  'src/app/api/admin/generate-vibes/route.ts',
  'src/app/api/admin/generate-vibes-zillow/route.ts',
  'src/app/api/admin/generate-neighborhood-vibes/route.ts',
] as const

const ENV_VAR_NAMES = [
  'STATUS_REFRESH_CRON_SECRET',
  'ZILLOW_CRON_SECRET',
  'VIBES_CRON_SECRET',
  'CRON_SECRET',
  'RAPIDAPI_KEY',
  'OPENROUTER_API_KEY',
] as const

const CRON_SECRET_VARS = [
  'STATUS_REFRESH_CRON_SECRET',
  'ZILLOW_CRON_SECRET',
  'VIBES_CRON_SECRET',
] as const

const SERVICE_KEY_VARS = ['RAPIDAPI_KEY', 'OPENROUTER_API_KEY'] as const

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

type RouteModule = {
  POST: (req: Request) => Promise<Response>
}

const containsEnvName = (text: string) =>
  ENV_VAR_NAMES.find((name) => text.includes(name))

describe('cron/admin secret opacity (static guards)', () => {
  it.each(ADMIN_ROUTES)(
    '%s: error response strings do not echo cron secret env-var names',
    (path) => {
      const source = read(path)

      // String literals returned to clients (errors / messages) must not name
      // the cron-secret env vars. We only forbid the literal token *inside
      // quoted strings*, not in env-lookup expressions like
      // `process.env.ZILLOW_CRON_SECRET`.
      const stringLiterals =
        source.match(/(['"`])[^'"`]*\1/g)?.map((s) => s.slice(1, -1)) ?? []

      for (const literal of stringLiterals) {
        for (const name of CRON_SECRET_VARS) {
          expect(literal).not.toContain(name)
        }
        // Catch human-readable variants too ("CRON secret not set", etc).
        expect(literal.toLowerCase()).not.toContain('cron secret not set')
        expect(literal.toLowerCase()).not.toContain(
          'cron secret not configured'
        )
      }
    }
  )

  it.each(ADMIN_ROUTES)(
    '%s: POST handler runs the cron-secret gate before any service-config gate',
    (path) => {
      const source = read(path)
      const postIdx = source.search(/export\s+async\s+function\s+POST\s*\(/)
      expect(postIdx).toBeGreaterThan(-1)
      const body = source.slice(postIdx)

      const unauthorizedIdx = body.search(/ApiErrorHandler\.unauthorized\s*\(/)
      expect(unauthorizedIdx).toBeGreaterThan(-1)

      // Any service-config presence checks (RAPIDAPI_KEY, OPENROUTER_API_KEY)
      // that result in a non-401 response must come *after* the
      // unauthorized-cron return. Otherwise an unauth probe can fingerprint
      // env state.
      for (const key of SERVICE_KEY_VARS) {
        const keyIdx = body.indexOf(key)
        if (keyIdx === -1) continue
        expect(keyIdx).toBeGreaterThan(unauthorizedIdx)
      }
    }
  )
})

describe('cron/admin secret opacity (unit guards)', () => {
  beforeEach(() => {
    jest.resetModules()
    // Strip every secret/key the routes consult so we exercise the
    // "missing env" branch.
    for (const name of [...CRON_SECRET_VARS, ...SERVICE_KEY_VARS]) {
      delete process.env[name]
    }
    Object.defineProperty(globalThis, 'fetch', {
      value: jest.fn(() => {
        throw new Error(
          'unauth probe must not reach fetch — side effect leaked'
        )
      }),
      configurable: true,
      writable: true,
    })
  })

  const sideEffectGuards = () => {
    const supabaseClient = {
      from: jest.fn(() => {
        throw new Error(
          'unauth probe must not touch Supabase — side effect leaked'
        )
      }),
    }
    jest.doMock('@/lib/supabase/standalone', () => ({
      createStandaloneClient: () => supabaseClient,
    }))
    jest.doMock('@/lib/ingestion/zillow', () => ({
      ingestZillowLocations: jest.fn(() => {
        throw new Error(
          'unauth probe must not invoke ingestion — side effect leaked'
        )
      }),
      ZillowSortOption: {},
    }))
    jest.doMock('@/lib/services/vibes', () => ({
      createVibesService: jest.fn(() => {
        throw new Error(
          'unauth probe must not invoke vibes service — side effect leaked'
        )
      }),
      VibesService: {
        generateSourceHash: jest.fn(),
        toInsertRecord: jest.fn(),
      },
    }))
    jest.doMock('@/lib/services/neighborhood-vibes', () => ({
      createNeighborhoodVibesService: jest.fn(() => {
        throw new Error(
          'unauth probe must not invoke neighborhood-vibes service — side effect leaked'
        )
      }),
      NeighborhoodVibesService: {
        toInsertRecord: jest.fn(),
      },
    }))
    return { supabaseClient }
  }

  const expectOpaque401 = async (res: Response) => {
    expect(res.status).toBe(401)
    const text = await res.text()
    expect(text.length).toBeGreaterThan(0)
    const leaked = containsEnvName(text)
    expect(leaked ?? null).toBeNull()
    // Common leak phrases that disclose env state.
    expect(text.toLowerCase()).not.toContain('not set')
    expect(text.toLowerCase()).not.toContain('not configured')
    expect(text.toLowerCase()).not.toContain('missing')
  }

  it.each(ADMIN_ROUTES)(
    '%s: POST without auth returns opaque 401 and triggers no side effects',
    async (path) => {
      const guards = sideEffectGuards()

      const importPath = path.replace(/^src\//, '@/').replace(/\.ts$/, '')
      // Variable annotation, not a type assertion: dynamic import returns
      // Promise<any>, which is assignable to RouteModule.
      const mod: RouteModule = await import(importPath)

      const res = await mod.POST(
        new Request(`http://localhost/${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
      )

      await expectOpaque401(res)
      expect(guards.supabaseClient.from).not.toHaveBeenCalled()
    }
  )

  it.each(ADMIN_ROUTES)(
    '%s: POST with wrong secret returns opaque 401 indistinguishable from missing env',
    async (path) => {
      // Secret is configured but the caller supplies a wrong one. The body
      // must look exactly the same as the missing-env case so probes cannot
      // fingerprint server config.
      process.env.ZILLOW_CRON_SECRET = 'configured-secret'
      process.env.STATUS_REFRESH_CRON_SECRET = 'configured-secret'
      process.env.VIBES_CRON_SECRET = 'configured-secret'

      const guards = sideEffectGuards()

      const importPath = path.replace(/^src\//, '@/').replace(/\.ts$/, '')
      const mod: RouteModule = await import(importPath)

      const res = await mod.POST(
        new Request(`http://localhost/${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-cron-secret': 'wrong-secret',
          },
          body: '{}',
        })
      )

      await expectOpaque401(res)
      expect(guards.supabaseClient.from).not.toHaveBeenCalled()
    }
  )
})
