/**
 * @jest-environment node
 */

import { readdirSync, readFileSync } from 'fs'
import { join, posix, relative, sep } from 'path'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

const toPosix = (path: string) => path.split(sep).join(posix.sep)

const walkRoutes = (root: string): string[] => {
  const absoluteRoot = join(process.cwd(), root)
  const out: string[] = []
  const stack: string[] = [absoluteRoot]
  while (stack.length) {
    const dir = stack.pop()!
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (entry.isFile() && entry.name === 'route.ts') {
        out.push(toPosix(relative(process.cwd(), full)))
      }
    }
  }
  return out.sort()
}

// Routes that intentionally do NOT require an authenticated end user
// (admin cron / service workers, public assets, anonymous metrics, health).
// Anything else under src/app/api MUST go through requireUserFromRequest.
const UNAUTHENTICATED_ROUTE_PREFIXES = [
  'src/app/api/admin/',
  'src/app/api/health/',
  'src/app/api/maps/metro-boundaries/',
  'src/app/api/maps/proxy-script/',
  'src/app/api/maps/script/',
  'src/app/api/performance/metrics/',
  'src/app/api/properties/marketing/',
  'src/app/api/zillow/random-image/',
]

const isUnauthenticatedRoute = (path: string) =>
  UNAUTHENTICATED_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix))

describe('Phase 1 auth boundary consolidation', () => {
  it.each([
    'src/app/api/couples/activity/route.ts',
    'src/app/api/couples/check-mutual/route.ts',
    'src/app/api/couples/disputed/route.ts',
    'src/app/api/couples/mutual-likes/route.ts',
    'src/app/api/couples/notify/route.ts',
    'src/app/api/couples/stats/route.ts',
    'src/app/api/interactions/reset/route.ts',
    'src/app/api/interactions/route.ts',
    'src/app/api/maps/geocode/route.ts',
    'src/app/api/maps/places/autocomplete/route.ts',
    'src/app/api/neighborhoods/vibes/route.ts',
    'src/app/api/properties/vibes/route.ts',
    'src/app/api/users/avatar/route.ts',
    'src/app/api/users/search/route.ts',
  ])(
    '%s uses requireUserFromRequest instead of open-coded auth extraction',
    (path) => {
      const source = read(path)

      expect(source).toContain('requireUserFromRequest')
      expect(source).not.toContain('getUserFromRequest(')
      expect(source).not.toContain('authError || !user')
      expect(source).not.toMatch(/supabase\.auth\.getUser\s*\(/)
    }
  )

  it('keeps bearer-token fallback in the canonical auth helper instead of monkey-patching the API client', () => {
    const authHelperSource = read('src/lib/api/auth.ts')
    const serverClientSource = read('src/lib/supabase/server.ts')

    expect(authHelperSource).toContain(
      'supabase.auth.getUser(bearerToken ?? undefined)'
    )
    expect(authHelperSource).toContain('return supabase.auth.getUser()')
    expect(serverClientSource).not.toContain('supabase.auth.getUser =')
    expect(serverClientSource).not.toContain('getUserWithBearer')
  })

  it('does not use service-role fallback in the user-scoped interactions write path', () => {
    const source = read('src/app/api/interactions/route.ts')

    expect(source).not.toContain('getServiceRoleClient')
    expect(source).not.toContain('fetchHouseholdIdWithServiceRole')
    expect(source).not.toContain('Service role lookup failed')
    expect(source).toContain(".select('household_id')")
  })

  it('forbids open-coded supabase auth extraction outside the canonical helper', () => {
    const offenders: Array<{ path: string; reason: string }> = []
    for (const path of walkRoutes('src/app/api')) {
      if (isUnauthenticatedRoute(path)) continue
      const source = read(path)
      if (/supabase\.auth\.getUser\s*\(/.test(source)) {
        offenders.push({ path, reason: 'calls supabase.auth.getUser directly' })
      }
      if (source.includes('authError || !user')) {
        offenders.push({
          path,
          reason: 'open-codes authError || !user check',
        })
      }
      if (/from ['"]@\/lib\/api\/auth['"]/.test(source)) {
        if (!source.includes('requireUserFromRequest')) {
          offenders.push({
            path,
            reason:
              'imports auth helper but does not use requireUserFromRequest',
          })
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('keeps the unauthenticated-route allowlist in sync with src/app/api', () => {
    const allRoutes = walkRoutes('src/app/api')
    const allowed = allRoutes.filter(isUnauthenticatedRoute)
    const protectedRoutes = allRoutes.filter((p) => !isUnauthenticatedRoute(p))

    // Every allowlisted prefix must match at least one real route — prevents
    // stale allowlist entries from silently masking new protected routes.
    for (const prefix of UNAUTHENTICATED_ROUTE_PREFIXES) {
      expect(allRoutes.some((p) => p.startsWith(prefix))).toBe(true)
    }

    // Every protected route must adopt the canonical helper.
    for (const path of protectedRoutes) {
      const source = read(path)
      expect(source).toContain('requireUserFromRequest')
    }

    expect(allowed.length + protectedRoutes.length).toBe(allRoutes.length)
  })
})
