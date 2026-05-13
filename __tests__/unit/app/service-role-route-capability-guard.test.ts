/**
 * @jest-environment node
 */
// Phase 0/1 closure: D1-service-role-rbac

// Phase 0/1 closure: D1-service-role-rbac
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const appDir = join(process.cwd(), 'src/app')

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) return listSourceFiles(fullPath)
    if (/\.(ts|tsx)$/.test(entry)) return [fullPath]
    return []
  })
}

describe('service-role route capability guard', () => {
  test('requires production app routes importing getServiceRoleClient to carry explicit capability rationale', () => {
    const routesUsingServiceRole = listSourceFiles(appDir).filter((filePath) =>
      readFileSync(filePath, 'utf8').includes('getServiceRoleClient')
    )

    expect(
      routesUsingServiceRole
        .map((filePath) => filePath.replace(process.cwd(), '.'))
        .sort()
    ).toEqual([
      './src/app/api/couples/disputed/route.ts',
      // Clerk-aware household write routes — verify Clerk session then pass
      // the resolved profile UUID to the new create_household_by_user_id RPC
      // / household_invitations table under service-role. HOUSEHOLD-001.
      './src/app/api/households/invitations/route.ts',
      './src/app/api/households/route.ts',
      // Phase 2 (Supabase-auth elim): POST/DELETE writes to
      // user_property_interactions cannot reach Clerk-authed users via
      // anon-key (auth.uid() is NULL → RLS blocks). Route already
      // resolves user.id → user_profiles.id via ensureUserProfileForCurrentClerkUser,
      // then writes under service-role with the explicit user_id.
      './src/app/api/interactions/route.ts',
      // Phase 2 (Supabase-auth elim): avatar POST + DELETE update
      // user_profiles.preferences. Same auth.uid() problem.
      './src/app/api/users/avatar/route.ts',
      // /api/users/me: anon-key Supabase client cannot read user_profiles
      // for Clerk users (RLS blocks because auth.uid() is null). Service-role
      // SELECT is scoped to the already-verified profile UUID.
      // API-USERS-ME-001.
      './src/app/api/users/me/route.ts',
      // ONBOARDING-001: preference update for the /onboarding flow.
      // Same Clerk + service-role pattern as the other write routes.
      './src/app/api/users/preferences/route.ts',
      './src/app/api/users/search/route.ts',
      './src/app/api/webhooks/clerk/route.ts',
      './src/app/invite/[token]/actions.ts',
      './src/app/invite/[token]/page.tsx',
    ])

    for (const filePath of routesUsingServiceRole) {
      const source = readFileSync(filePath, 'utf8')
      expect(source).toContain('@service-role-capability:')
      expect(source).toContain('TODO(D1 follow-up): replace with')
    }
  })
})
