/**
 * @jest-environment node
 *
 * Static guard for the service-role bypass surface. Complements
 * `service-role-route-capability-guard.test.ts` (route allowlist + annotation)
 * by locking down:
 *
 *   1. The `ApprovedServiceRoleCapability` union must remain exactly the
 *      enumerated set — adding a new capability requires updating this test
 *      together with `src/lib/supabase/server.ts`.
 *   2. The runtime `APPROVED_SERVICE_ROLE_CAPABILITIES` Set must list the
 *      same enumerated values in the same casing.
 *   3. Each approved service-role route must contain an auth-guard call
 *      (or be on the pre-auth allowlist with a documented invite-preview
 *      capability rationale).
 *   4. Only the gated wrapper `src/lib/supabase/service-role-client.ts` may
 *      import `createServiceClient` from `@/lib/supabase/server`.
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const REPO_ROOT = process.cwd()
const SERVER_TS = join(REPO_ROOT, 'src/lib/supabase/server.ts')
const APP_DIR = join(REPO_ROOT, 'src/app')
const SRC_DIR = join(REPO_ROOT, 'src')
const GATED_WRAPPER = './src/lib/supabase/service-role-client.ts'

const EXPECTED_CAPABILITIES = [
  'household-disputes',
  'invite-acceptance',
  'invite-preview',
  'users-search',
] as const

const APPROVED_ROUTES = [
  './src/app/api/couples/disputed/route.ts',
  './src/app/api/users/search/route.ts',
  './src/app/invite/[token]/actions.ts',
  './src/app/invite/[token]/page.tsx',
] as const

// Pre-auth surfaces: documented exceptions where the bypass runs before
// authentication because the capability is invite-preview by opaque token.
const PRE_AUTH_ROUTES = new Set<string>([
  './src/app/invite/[token]/page.tsx',
])

const AUTH_GUARD_PATTERNS = [
  /requireUserFromRequest\s*\(/,
  /auth\.getUser\s*\(/,
  /\.auth\.getUser\s*\(/,
]

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) return listSourceFiles(fullPath)
    if (/\.(ts|tsx)$/.test(entry)) return [fullPath]
    return []
  })
}

function rel(filePath: string): string {
  return filePath.replace(REPO_ROOT, '.')
}

describe('service-role capability allowlist guard', () => {
  const serverSource = readFileSync(SERVER_TS, 'utf8')

  test('ApprovedServiceRoleCapability union lists exactly the enumerated capabilities', () => {
    const unionMatch = serverSource.match(
      /export\s+type\s+ApprovedServiceRoleCapability\s*=\s*([^\n][\s\S]*?)(?=\n\n|\nexport|\ntype\s|\nconst\s)/
    )
    expect(unionMatch).not.toBeNull()

    const literalRegex = /'([^']+)'/g
    const declaredLiterals = Array.from(
      (unionMatch?.[1] ?? '').matchAll(literalRegex),
      (match) => match[1]
    ).sort()

    expect(declaredLiterals).toEqual([...EXPECTED_CAPABILITIES])
  })

  test('APPROVED_SERVICE_ROLE_CAPABILITIES Set initializer mirrors the union exactly', () => {
    const setMatch = serverSource.match(
      /APPROVED_SERVICE_ROLE_CAPABILITIES\s*=\s*new\s+Set<ApprovedServiceRoleCapability>\(\[([\s\S]*?)\]\)/
    )
    expect(setMatch).not.toBeNull()

    const literalRegex = /'([^']+)'/g
    const setLiterals = Array.from(
      (setMatch?.[1] ?? '').matchAll(literalRegex),
      (match) => match[1]
    ).sort()

    expect(setLiterals).toEqual([...EXPECTED_CAPABILITIES])
  })

  test('createServiceClient still gates non-capability calls behind checkServiceRoleAuthorization', () => {
    // The bypass path must remain: capability OR admin authorization, never raw.
    expect(serverSource).toMatch(
      /hasApprovedCapability\s*\|\|\s*\(await\s+checkServiceRoleAuthorization\(\)\)/
    )
    expect(serverSource).toMatch(/throw new Error\('Unauthorized access to service role client'\)/)
  })

  test('each approved service-role route contains an auth guard or is on the pre-auth allowlist', () => {
    for (const relPath of APPROVED_ROUTES) {
      const source = readFileSync(join(REPO_ROOT, relPath.slice(2)), 'utf8')
      const hasAuthGuard = AUTH_GUARD_PATTERNS.some((pattern) =>
        pattern.test(source)
      )

      if (PRE_AUTH_ROUTES.has(relPath)) {
        // Pre-auth surfaces must document the invite-preview capability so
        // the exception is reviewable in the diff.
        expect(source).toMatch(/invite-preview|invite landing page/i)
      } else {
        expect({ relPath, hasAuthGuard }).toEqual({
          relPath,
          hasAuthGuard: true,
        })
      }
    }
  })

  test('only the gated wrapper may import createServiceClient from @/lib/supabase/server', () => {
    const importPattern =
      /import\s+\{[^}]*\bcreateServiceClient\b[^}]*\}\s+from\s+['"]@\/lib\/supabase\/server['"]/

    const offenders = listSourceFiles(SRC_DIR)
      .filter((filePath) => filePath !== SERVER_TS)
      .filter((filePath) => importPattern.test(readFileSync(filePath, 'utf8')))
      .map(rel)
      .sort()

    expect(offenders).toEqual([GATED_WRAPPER])
  })

  test('the route capability allowlist matches the files that import getServiceRoleClient under src/app', () => {
    const importers = listSourceFiles(APP_DIR)
      .filter((filePath) =>
        readFileSync(filePath, 'utf8').includes('getServiceRoleClient')
      )
      .map(rel)
      .sort()

    expect(importers).toEqual([...APPROVED_ROUTES])
  })
})
