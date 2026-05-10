/**
 * @jest-environment node
 *
 * Static adoption scan for the rate-limiter helpers on mutation/expensive
 * API routes. Every exported POST/PUT/PATCH/DELETE handler under
 * src/app/api/**\/route.ts must either:
 *
 *   1. Be a trivial method-not-allowed guard (Next.js requires explicit
 *      handlers for unsupported methods to avoid hanging requests in
 *      tests/E2E), or
 *   2. Invoke one of the shared rate-limit helpers
 *      (`checkRateLimit`, `withRateLimit`, `rateLimit`, `authRateLimit`,
 *      `rateLimitAdminRoute`) AND import from the helper module, or
 *   3. Appear on the documented `INTENTIONAL_EXCEPTIONS` list below with
 *      a recorded reason.
 *
 * The exception list is the *documentation* — adding an entry requires a
 * concrete reason explaining why the helper is not applicable. This keeps
 * adoption decisions reviewable in code rather than scattered across
 * tickets.
 */
// Phase 0/1 closure: M5-route-limiter

// Phase 0/1 closure: M5-route-limiter
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const API_ROOT = join(process.cwd(), 'src/app/api')
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const
type MutationMethod = (typeof MUTATION_METHODS)[number]

const RATE_LIMIT_HELPER_TOKENS = [
  'checkRateLimit(',
  'withRateLimit(',
  'rateLimit(', // matches rateLimit(request, ...) but also checkRateLimit/withRateLimit; that is fine
  'authRateLimit(',
  'rateLimitAdminRoute(',
] as const

const RATE_LIMIT_IMPORT_SOURCES = [
  '@/lib/middleware/rateLimiter',
  '@/lib/api/admin-rate-limit',
] as const

/**
 * Routes (or specific handler methods) that intentionally do not apply the
 * shared rate-limit helpers. Each entry MUST include a `reason` describing
 * why the helper is not applicable. Entries with an empty `methods` array
 * apply to every mutation method on the route.
 */
const INTENTIONAL_EXCEPTIONS: ReadonlyArray<{
  path: string
  methods?: ReadonlyArray<MutationMethod>
  reason: string
}> = [
  // No active exceptions today. Every non-stub mutation handler on
  // src/app/api/** currently routes through the shared rate-limit
  // helpers. Add an entry here only with an explicit reason (e.g. a
  // route that proxies to a downstream service that already enforces
  // its own per-IP throttling) and link the discussion in the reason.
]

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

/**
 * Extract the body of an exported handler for `method`. Supports both
 *   `export async function POST(...) { ... }`
 * and
 *   `export const POST = withRouteDeadline('...', 10000, async function POST(request) { ... })`
 * forms. Returns null when the handler is not exported from the file.
 */
const extractHandlerBody = (
  source: string,
  method: MutationMethod
): string | null => {
  const fnHeader = new RegExp(
    `export\\s+async\\s+function\\s+${method}\\s*\\(`,
    'm'
  )
  const constHeader = new RegExp(`export\\s+const\\s+${method}\\s*=`, 'm')

  const fnMatch = fnHeader.exec(source)
  const constMatch = constHeader.exec(source)
  const start = fnMatch?.index ?? constMatch?.index
  if (start === undefined) return null

  // Find the next exported handler so that body extraction is bounded.
  const remaining = source.slice(start + 1)
  const nextHeader =
    /\n(?:export\s+(?:async\s+function|const)\s+(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b)/.exec(
      remaining
    )
  return remaining.slice(0, nextHeader ? nextHeader.index : remaining.length)
}

const STUB_PATTERN = /return\s+ApiErrorHandler\.methodNotAllowed\(/
const isMethodNotAllowedStub = (body: string): boolean => {
  // A stub handler's body should contain ONLY a methodNotAllowed return
  // and no rate-limited business logic. We treat any handler that hits
  // the stub pattern AND has fewer than ~6 statements as intentional.
  if (!STUB_PATTERN.test(body)) return false
  const statements = body.split(/[;\n]/).filter((line) => {
    const trimmed = line.trim()
    return (
      trimmed.length > 0 &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('*')
    )
  })
  return statements.length <= 6
}

const importsRateLimitHelper = (source: string): boolean =>
  RATE_LIMIT_IMPORT_SOURCES.some((src) =>
    new RegExp(`from\\s+['"]${src}['"]`).test(source)
  )

const handlerInvokesHelper = (body: string): boolean =>
  RATE_LIMIT_HELPER_TOKENS.some((tok) => body.includes(tok))

const isExcepted = (
  routePath: string,
  method: MutationMethod
): { excepted: boolean; reason?: string } => {
  for (const ex of INTENTIONAL_EXCEPTIONS) {
    if (ex.path !== routePath) continue
    if (!ex.methods || ex.methods.length === 0)
      return { excepted: true, reason: ex.reason }
    if (ex.methods.includes(method))
      return { excepted: true, reason: ex.reason }
  }
  return { excepted: false }
}

describe('Phase 1 mutation route rate-limit adoption scan', () => {
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

  describe.each(routeFiles)('%s', (absPath) => {
    const relPath = relative(process.cwd(), absPath).split('\\').join('/')
    const source = readFileSync(absPath, 'utf8')

    it.each(MUTATION_METHODS)(
      `${relPath} %s handler is rate-limited, a stub, or documented`,
      (method) => {
        const body = extractHandlerBody(source, method)
        if (body === null) {
          // Method not implemented on this route; nothing to enforce.
          return
        }

        if (isMethodNotAllowedStub(body)) {
          // Trivial guard rail — Next.js requires an explicit handler so
          // unsupported methods don't hang. No request work is performed,
          // so rate-limiting is unnecessary.
          return
        }

        const { excepted, reason } = isExcepted(relPath, method)
        if (excepted) {
          expect(reason).toBeDefined()
          return
        }

        const importsHelper = importsRateLimitHelper(source)
        const invokesHelper = handlerInvokesHelper(body)

        if (!importsHelper || !invokesHelper) {
          throw new Error(
            `Route ${relPath} ${method} performs request work but does not invoke a shared rate-limit helper. ` +
              `Either call checkRateLimit/withRateLimit/rateLimit/authRateLimit/rateLimitAdminRoute, ` +
              `convert the handler into an ApiErrorHandler.methodNotAllowed() stub, ` +
              `or add an entry to INTENTIONAL_EXCEPTIONS with a documented reason.`
          )
        }

        expect(importsHelper).toBe(true)
        expect(invokesHelper).toBe(true)
      }
    )
  })
})
