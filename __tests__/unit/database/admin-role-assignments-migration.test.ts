/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260508024000_create_admin_role_assignments.sql'
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

  test('service-role authorization no longer derives authority from user_profiles.role', () => {
    const source = readFileSync(serverPath, 'utf8')
    const authorizationBlock = source.slice(
      source.indexOf('async function checkServiceRoleAuthorization'),
      source.length
    )

    expect(authorizationBlock).toContain(".from('admin_role_assignments')")
    expect(authorizationBlock).not.toContain(".from('user_profiles')")
    expect(authorizationBlock).not.toContain("role === 'admin'")
  })
})
