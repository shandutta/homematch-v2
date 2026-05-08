import { readFileSync } from 'fs'
import * as path from 'path'

const readRepoFile = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), 'utf8')

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()

describe('D1 service-role RBAC authority packet', () => {
  const packet = normalize(
    readRepoFile(
      'reports/home-match-revival/d1-service-role-rbac-authority-implementation-packet-2026-05-08.md'
    )
  )
  const matrix = normalize(
    readRepoFile('reports/home-match-revival/phase0-phase1-closure-matrix.md')
  )

  it('records the current placeholder authority and a concrete replacement model', () => {
    expect(packet).toContain("user_profiles.role === 'admin'")
    expect(packet).toContain('placeholder-grade authority')
    expect(packet).toContain('Use a dedicated admin authority table')
    expect(packet).toContain('public.admin_role_assignments')
    expect(packet).toContain(
      'Supabase custom claims are fast at request time but require external auth metadata mutation and token refresh discipline'
    )
    expect(packet).toContain(
      'Accepting `user_profiles.role` would be smallest, but it preserves the same profile-table self-/app-write risk class'
    )
  })

  it('keeps service-role user flows constrained and acceptance-testable', () => {
    expect(packet).toContain('src/app/api/users/search/route.ts')
    expect(packet).toContain('src/app/api/couples/disputed/route.ts')
    expect(packet).toContain('src/app/invite/[token]/actions.ts')
    expect(packet).toContain('constrained RPCs or capability-specific helpers')
    expect(packet).toContain('no partner email')
    expect(packet).toContain('Ordinary application users cannot create or modify their own admin assignment')
  })

  it('preserves owner approval and non-closure status in the closure matrix', () => {
    expect(matrix).toContain(
      'd1-service-role-rbac-authority-implementation-packet-2026-05-08.md'
    )
    expect(matrix).toContain('Phase 1 remains open')
    expect(matrix).toContain('Approve dedicated `admin_role_assignments` table')
    expect(matrix).toContain('Do not advance to Phase 2')
  })
})
