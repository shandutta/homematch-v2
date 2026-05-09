/**
 * @jest-environment node
 *
 * Static adoption scan for the outbound fetch timeout wrapper. Every API
 * route under `src/app/api/**\/route.ts` that performs an outbound HTTP
 * request must use `fetchWithTimeout(...)` from `@/lib/api/fetch-timeout`
 * rather than the global `fetch(...)`, so an unresponsive upstream can
 * never stall a request indefinitely.
 *
 * The scan walks all route files and rejects raw `fetch(` invocations.
 * Routes that intentionally do not perform an outbound call but contain
 * the `fetch(` token (e.g. a script-response that returns `fetch(...)` as
 * literal client-side code, or a documentation example) can opt out via
 * `INTENTIONAL_EXCEPTIONS` with a recorded reason.
 *
 * Two anchor blocks back the auto-scan:
 *   1. `HISTORICAL_OUTBOUND_ROUTES` — routes that shipped Phase 1 timeout
 *      adoption. These must keep importing AND invoking the helper, so a
 *      regression that moves the call to a sibling helper module still
 *      trips the scan.
 *   2. The auto-scan itself, which catches new routes added after Phase 1.
 */
// Phase 0/1 closure: M13-dead-zillow-factory
// Phase 0/1 closure: M8-external-timeouts

import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const API_ROOT = join(process.cwd(), 'src/app/api')

const FETCH_TIMEOUT_MODULE = '@/lib/api/fetch-timeout'
const FETCH_TIMEOUT_HELPER = 'fetchWithTimeout('

// Match a global `fetch(` call. The lookbehind rejects identifiers and
// member accesses (`my_fetch(`, `obj.fetch(`, `fetchWithTimeout(`).
const RAW_FETCH = /(?<![\w$.])fetch\(/g

/**
 * Routes that intentionally contain a `fetch(` token without performing
 * an outbound call from the server. Each entry MUST include a `reason`
 * describing why the helper is not applicable. Empty today.
 */
const INTENTIONAL_EXCEPTIONS: ReadonlyArray<{
  path: string
  reason: string
}> = [
  // No active exceptions today. Add an entry only with an explicit reason
  // (e.g. a script-response endpoint that returns `fetch(...)` as literal
  // client-side code rather than performing an outbound call itself).
]

const HISTORICAL_OUTBOUND_ROUTES = [
  'src/app/api/maps/geocode/route.ts',
  'src/app/api/maps/places/autocomplete/route.ts',
  'src/app/api/maps/proxy-script/route.ts',
  'src/app/api/admin/generate-vibes-zillow/route.ts',
  'src/app/api/admin/status-refresh/route.ts',
  'src/app/api/zillow/random-image/route.ts',
] as const

const collectRouteFiles = (root: string): string[] => {
  const out: string[] = []
  const walk = (dir: string) => {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry)
      const info = statSync(full)
      if (info.isDirectory()) walk(full)
      else if (entry === 'route.ts') out.push(full)
    }
  }
  walk(root)
  return out.sort()
}

// Strip line + block comments so commented-out `fetch(` examples don't
// trip the scan. The `[^:]` guard preserves URL schemes (`http://...`).
const stripCommentsAndStrings = (source: string): string => {
  // Remove block comments first.
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '')
  // Remove single-line comments (sparing `://` URL schemes).
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, '$1')
  // Remove single- and double-quoted string literals so embedded
  // `'fetch('` tokens (e.g. error-message strings) cannot trip the scan.
  out = out.replace(/'(?:\\.|[^'\\\n])*'/g, "''")
  out = out.replace(/"(?:\\.|[^"\\\n])*"/g, '""')
  // Template literals: keep ${...} expressions, blank out plain text. We
  // only need to neutralize literal `fetch(` text inside the backtick
  // body, so a coarse pass is fine.
  out = out.replace(/`(?:\\.|[^`\\])*`/g, '``')
  return out
}

const isExcepted = (
  relPath: string
): { excepted: boolean; reason?: string } => {
  for (const ex of INTENTIONAL_EXCEPTIONS) {
    if (ex.path === relPath) return { excepted: true, reason: ex.reason }
  }
  return { excepted: false }
}

const toRel = (absPath: string): string =>
  relative(process.cwd(), absPath).split('\\').join('/')

describe('M8 / Phase 1 outbound fetch timeout adoption scan', () => {
  const routeFiles = collectRouteFiles(API_ROOT)

  it('discovers at least one API route to scan', () => {
    expect(routeFiles.length).toBeGreaterThan(0)
  })

  it('every documented exception still points at an existing route', () => {
    for (const ex of INTENTIONAL_EXCEPTIONS) {
      const abs = join(process.cwd(), ex.path)
      try {
        statSync(abs)
      } catch {
        throw new Error(
          `INTENTIONAL_EXCEPTIONS references missing route ${ex.path}`
        )
      }
      expect(ex.reason.trim().length).toBeGreaterThan(10)
    }
  })

  it.each(routeFiles)(
    '%s does not perform outbound fetch without fetchWithTimeout',
    (absPath) => {
      const relPath = toRel(absPath)
      const source = readFileSync(absPath, 'utf8')
      const stripped = stripCommentsAndStrings(source)

      const rawMatches = stripped.match(RAW_FETCH) ?? []

      if (rawMatches.length === 0) {
        // No raw fetch token. If the route uses fetchWithTimeout, sanity
        // check the import wiring so accidental copy-paste regressions
        // (helper invoked but module not imported) are caught here.
        if (stripped.includes(FETCH_TIMEOUT_HELPER)) {
          expect(source).toContain(FETCH_TIMEOUT_MODULE)
        }
        return
      }

      const { excepted, reason } = isExcepted(relPath)
      if (excepted) {
        expect(reason).toBeDefined()
        return
      }

      throw new Error(
        `Route ${relPath} contains a raw global fetch(...) call. ` +
          `Replace it with fetchWithTimeout(...) from ${FETCH_TIMEOUT_MODULE} ` +
          `or add an entry to INTENTIONAL_EXCEPTIONS with a documented reason.`
      )
    }
  )

  it.each(HISTORICAL_OUTBOUND_ROUTES)(
    '%s still imports and invokes fetchWithTimeout',
    (routePath) => {
      const source = readFileSync(join(process.cwd(), routePath), 'utf8')
      expect(source).toContain(FETCH_TIMEOUT_MODULE)
      expect(source).toContain(FETCH_TIMEOUT_HELPER)
    }
  )
})
