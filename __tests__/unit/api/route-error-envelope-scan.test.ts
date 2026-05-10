/**
 * @jest-environment node
 *
 * Static adoption scan for the canonical API error envelope helpers
 * (`ApiErrorHandler` from `@/lib/api/errors`). Every `route.ts` under
 * `src/app/api/**` must either:
 *
 *   1. Import the shared error helper module (`@/lib/api/errors`) AND
 *      contain no inline `NextResponse.json({ error: ... })` style error
 *      bodies that bypass the canonical `{ error, code, details? }`
 *      envelope, or
 *   2. Appear on the documented `INTENTIONAL_EXCEPTIONS` list below with
 *      a recorded reason.
 *
 * The exception list is the *documentation* — adding an entry requires a
 * concrete reason explaining why the helper is not applicable. This keeps
 * envelope decisions reviewable in code rather than scattered across
 * tickets.
 *
 * This complements the per-route assertions in
 * `error-standardization.test.ts` by providing a route-family-wide guard
 * that catches NEW routes which forget to adopt the helper.
 */
// Phase 0/1 closure: M6-error-standardization

// Phase 0/1 closure: M6-error-standardization
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const API_ROOT = join(process.cwd(), 'src/app/api')

const ERROR_HELPER_IMPORT_SOURCE = '@/lib/api/errors'

/**
 * Routes that intentionally do not use `ApiErrorHandler`. Each entry MUST
 * include a `reason` describing why the helper is not applicable. These
 * are typically routes that do not return a JSON response at all (so the
 * JSON error envelope shape does not apply).
 */
const INTENTIONAL_EXCEPTIONS: ReadonlyArray<{
  path: string
  reason: string
}> = [
  {
    path: 'src/app/api/maps/proxy-script/route.ts',
    reason:
      'Proxies the Google Maps JavaScript API and returns raw application/javascript bodies (with comment-style error markers); the JSON `{ error, code }` envelope does not apply to a script-tag-loaded resource.',
  },
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

const importsErrorHelper = (source: string): boolean =>
  new RegExp(`from\\s+['"]${ERROR_HELPER_IMPORT_SOURCE}['"]`).test(source)

/**
 * Detect inline error-envelope bodies that bypass `ApiErrorHandler`.
 * Matches `NextResponse.json({ error: ...` and `Response.json({ error: ...`
 * spread across one or more lines, including trailing whitespace before
 * the `error:` key.
 */
const INLINE_ERROR_BODY_PATTERNS: ReadonlyArray<RegExp> = [
  /NextResponse\.json\(\s*\{\s*error\s*:/m,
  /\bResponse\.json\(\s*\{\s*error\s*:/m,
  /new\s+NextResponse\(\s*JSON\.stringify\(\s*\{\s*error\s*:/m,
]

const findInlineErrorBodies = (source: string): RegExp[] =>
  INLINE_ERROR_BODY_PATTERNS.filter((pat) => pat.test(source))

const isExcepted = (
  routePath: string
): { excepted: boolean; reason?: string } => {
  for (const ex of INTENTIONAL_EXCEPTIONS) {
    if (ex.path === routePath) return { excepted: true, reason: ex.reason }
  }
  return { excepted: false }
}

describe('Phase 1 API route error envelope adoption scan', () => {
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
      expect(ex.reason.trim().length).toBeGreaterThan(20)
    }
  })

  describe.each(routeFiles)('%s', (absPath) => {
    const relPath = relative(process.cwd(), absPath).split('\\').join('/')
    const source = readFileSync(absPath, 'utf8')

    it(`${relPath} imports the canonical error envelope helper or is documented`, () => {
      const { excepted, reason } = isExcepted(relPath)
      if (excepted) {
        expect(reason).toBeDefined()
        return
      }

      if (!importsErrorHelper(source)) {
        throw new Error(
          `Route ${relPath} does not import ${ERROR_HELPER_IMPORT_SOURCE}. ` +
            `Either route error responses through ApiErrorHandler ` +
            `(badRequest/unauthorized/forbidden/notFound/serverError/...) ` +
            `or add an entry to INTENTIONAL_EXCEPTIONS with a documented reason.`
        )
      }

      expect(importsErrorHelper(source)).toBe(true)
    })

    it(`${relPath} has no inline error envelope bodies bypassing ApiErrorHandler`, () => {
      const { excepted } = isExcepted(relPath)
      if (excepted) return

      const offenders = findInlineErrorBodies(source)
      if (offenders.length > 0) {
        throw new Error(
          `Route ${relPath} contains inline error envelope bodies that ` +
            `bypass ApiErrorHandler (matched: ${offenders
              .map((p) => p.toString())
              .join(', ')}). ` +
            `Replace inline { error: ... } JSON with the appropriate ` +
            `ApiErrorHandler.<helper>() call so all errors share the ` +
            `canonical { error, code, details? } envelope.`
        )
      }

      expect(offenders).toEqual([])
    })
  })
})
