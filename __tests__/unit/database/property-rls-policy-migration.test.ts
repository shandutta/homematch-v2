/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260508003500_fix_properties_public_select_policy.sql'
)

describe('properties public SELECT policy hardening migration', () => {
  const migration = () => readFileSync(migrationPath, 'utf8')

  it('replaces the broad active properties policy with a listing-status-gated policy', () => {
    const sql = migration()

    expect(sql).toContain(
      'DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties'
    )
    expect(sql).toContain('CREATE POLICY "Anyone can view active properties"')
    expect(sql).toContain('ON public.properties')
    expect(sql).toContain('FOR SELECT')
    expect(sql).toContain("listing_status = 'active'")
    expect(sql).toContain('coalesce(is_active, true) = true')
  })

  it('does not leave the original is_active-only predicate in place', () => {
    const sql = migration()
    const normalizedSql = sql.replace(/\s+/g, ' ')

    expect(normalizedSql).not.toMatch(/USING \(\s*is_active = true\s*\)/i)
  })
})
