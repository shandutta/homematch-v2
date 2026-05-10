/**
 * @jest-environment node
 *
 * Static guard for the invite + household auth/service-role boundary.
 *
 * Complements `service-role-route-capability-guard.test.ts`, which pins which
 * routes may import `getServiceRoleClient`. This file enforces the *shape* of
 * those usages: callers must do user-scope auth before elevating, household
 * pages must stay user-scoped, the service-role key must never be read from
 * inside `src/app/**`, and the gated `createServiceClient` wrapper must be the
 * single elevation point.
 */
// Phase 0/1 closure: P0-strict-anon-protected

// Phase 0/1 closure: P0-strict-anon-protected
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative, sep } from 'path'

const repoRoot = process.cwd()
const appDir = join(repoRoot, 'src/app')
const householdDir = join(appDir, 'household')
const inviteAcceptanceFile = join(appDir, 'invite/[token]/actions.ts')
const invitePreviewFile = join(appDir, 'invite/[token]/page.tsx')
const serverHelperFile = join(repoRoot, 'src/lib/supabase/server.ts')
const serviceRoleWrapperFile = join(
  repoRoot,
  'src/lib/supabase/service-role-client.ts'
)

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) return listSourceFiles(fullPath)
    if (/\.(ts|tsx)$/.test(entry)) return [fullPath]
    return []
  })
}

const toRepoRel = (filePath: string) =>
  './' + relative(repoRoot, filePath).split(sep).join('/')

describe('invite + household auth/service-role boundary (static)', () => {
  test('no app-layer file reads the raw service-role key — elevation must go through the gated wrapper', () => {
    const offenders = listSourceFiles(appDir).filter((filePath) =>
      readFileSync(filePath, 'utf8').includes('SUPABASE_SERVICE_ROLE_KEY')
    )

    expect(offenders.map(toRepoRel).sort()).toEqual([])
  })

  test('only the service-role wrapper imports the gated createServiceClient from the server helper', () => {
    const importers = listSourceFiles(join(repoRoot, 'src')).filter(
      (filePath) => {
        if (filePath === serverHelperFile) return false
        const source = readFileSync(filePath, 'utf8')
        return /import\s+\{[^}]*\bcreateServiceClient\b[^}]*\}\s+from\s+['"]@\/lib\/supabase\/server['"]/.test(
          source
        )
      }
    )

    expect(importers.map(toRepoRel).sort()).toEqual([
      toRepoRel(serviceRoleWrapperFile),
    ])
  })

  test('household create/join routes stay user-scoped and never reach for service role', () => {
    const householdFiles = listSourceFiles(householdDir)

    expect(householdFiles.length).toBeGreaterThan(0)

    for (const filePath of householdFiles) {
      const source = readFileSync(filePath, 'utf8')
      expect(source).not.toContain('getServiceRoleClient')
      expect(source).not.toContain('service-role-client')
      expect(source).not.toContain('createServiceClient')
      expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    }
  })

  test('invite acceptance authenticates the user before elevating to service role and scopes mutations to user.id', () => {
    const source = readFileSync(inviteAcceptanceFile, 'utf8')

    expect(source).toContain(
      "import { createClient } from '@/lib/supabase/server'"
    )
    expect(source).toContain(
      "import { getServiceRoleClient } from '@/lib/supabase/service-role-client'"
    )
    expect(source).toContain('supabase.auth.getUser()')

    const createClientIndex = source.indexOf('await createClient()')
    const authGetUserIndex = source.indexOf('supabase.auth.getUser()')
    const serviceRoleIndex = source.indexOf('await getServiceRoleClient()')

    expect(createClientIndex).toBeGreaterThanOrEqual(0)
    expect(authGetUserIndex).toBeGreaterThan(createClientIndex)
    expect(serviceRoleIndex).toBeGreaterThan(authGetUserIndex)

    expect(source).toMatch(
      /if\s*\(!user\)\s*\{[\s\S]*?redirect\(`\/login\?redirectTo=\/invite\/\$\{token\}`\)/
    )

    expect(source).toMatch(/\.eq\(\s*'id'\s*,\s*user!\.id\s*\)/)
  })

  test('invite preview pairs the gated service-role read with a user-scope auth probe', () => {
    const source = readFileSync(invitePreviewFile, 'utf8')

    expect(source).toContain(
      "import { createClient } from '@/lib/supabase/server'"
    )
    expect(source).toContain(
      "import { getServiceRoleClient } from '@/lib/supabase/service-role-client'"
    )
    expect(source).toContain('supabase.auth.getUser()')

    const serviceRoleIndex = source.indexOf('await getServiceRoleClient()')
    const authGetUserIndex = source.indexOf('supabase.auth.getUser()')

    expect(serviceRoleIndex).toBeGreaterThanOrEqual(0)
    expect(authGetUserIndex).toBeGreaterThan(0)
  })

  test('approved service-role capability set pins invite-preview and invite-acceptance', () => {
    const source = readFileSync(serverHelperFile, 'utf8')

    expect(source).toMatch(
      /export type ApprovedServiceRoleCapability\s*=[^]*'invite-acceptance'/
    )
    expect(source).toMatch(
      /export type ApprovedServiceRoleCapability\s*=[^]*'invite-preview'/
    )

    expect(source).toMatch(
      /APPROVED_SERVICE_ROLE_CAPABILITIES\s*=\s*new Set<ApprovedServiceRoleCapability>\(\[[^\]]*'invite-acceptance'/
    )
    expect(source).toMatch(
      /APPROVED_SERVICE_ROLE_CAPABILITIES\s*=\s*new Set<ApprovedServiceRoleCapability>\(\[[^\]]*'invite-preview'/
    )
  })
})
