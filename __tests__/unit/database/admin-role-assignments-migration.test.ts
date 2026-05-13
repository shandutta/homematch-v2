/**
 * @jest-environment node
 */

// Phase 0/1 closure: D1-service-role-rbac
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260508024000_create_admin_role_assignments.sql'
)
const phase5DropMigrationPath = join(
  process.cwd(),
  'supabase/migrations/20260513070000_auth_elim_phase5_drop_authuid_policies.sql'
)
const serverPath = join(process.cwd(), 'src/lib/supabase/server.ts')

describe('admin role assignments migration', () => {
  test('creates a dedicated admin authority table with RLS enabled', () => {
    const sql = readFileSync(migrationPath, 'utf8')
    const normalized = sql.replace(/\s+/g, ' ')

    expect(normalized).toContain(
      'create table if not exists public.admin_role_assignments'
    )
    expect(normalized).toContain(
      'alter table public.admin_role_assignments enable row level security'
    )
    expect(normalized).toContain(
      "constraint admin_role_assignments_role_check check (role in ('admin'))"
    )
    expect(normalized).toContain(
      'grant select on table public.admin_role_assignments to authenticated'
    )
  })

  test('does not grant authenticated users a self-promotion write path', () => {
    const sql = readFileSync(migrationPath, 'utf8')
    const normalized = sql.replace(/\s+/g, ' ').toLowerCase()

    expect(normalized).toContain(
      'revoke all on table public.admin_role_assignments from authenticated'
    )
    expect(normalized).not.toMatch(/for\s+insert\s+to\s+authenticated/)
    expect(normalized).not.toMatch(/for\s+update\s+to\s+authenticated/)
    expect(normalized).not.toMatch(/for\s+delete\s+to\s+authenticated/)
  })

  test('documents rollback coverage', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('-- DOWN:')
    expect(sql).toContain(
      'DROP POLICY IF EXISTS admin_role_assignments_self_select'
    )
    expect(sql).toContain('DROP TABLE IF EXISTS public.admin_role_assignments')
  })

  test('service-role authorization fallback is removed entirely (A3 audit fix, 2026-05-13)', () => {
    // The previous guarantee was that the runtime fallback read from
    // admin_role_assignments (not user_profiles.role). A3 in the
    // 2026-05-13 audit went further: the fallback was deleted outright
    // because every caller now declares an `approvedCapability`. This
    // test now pins the STRONGER guarantee — the function no longer
    // exists and the source no longer references admin_role_assignments
    // from server.ts. Re-introducing the function should fail this test.
    const source = readFileSync(serverPath, 'utf8')

    expect(source).not.toContain('async function checkServiceRoleAuthorization')
    expect(source).not.toContain(".from('admin_role_assignments')")
    expect(source).not.toContain('checkServiceRoleAuthorization()')
  })

  test('phase 5 retires the table outright (Supabase-auth elim, 2026-05-13)', () => {
    // The CREATE migration above stays in history (immutable), but
    // Phase 5 of the auth-elimination drops the table. Pinning the
    // drop here makes the retirement explicit and catches a future
    // resurrection at code-review time.
    const sql = readFileSync(phase5DropMigrationPath, 'utf8')
    const normalized = sql.replace(/\s+/g, ' ').toLowerCase()

    expect(normalized).toContain(
      'drop policy if exists admin_role_assignments_self_select on public.admin_role_assignments'
    )
    expect(normalized).toContain(
      'drop table if exists public.admin_role_assignments'
    )
  })
})
