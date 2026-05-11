/**
 * @jest-environment node
 */

// Phase 0/1 closure: P1-properties-rls
import { readFileSync } from 'fs'
import { join } from 'path'

const deletePolicyMigrationPath = join(
  process.cwd(),
  'supabase/migrations/20260508021000_add_user_profiles_delete_policy.sql'
)
const consolidatedPolicyPath = join(
  process.cwd(),
  'supabase/migrations/20251130200000_consolidated_pending_features.sql'
)

describe('Phase 1 RLS policy closure', () => {
  it('adds a self-delete policy for user_profiles', () => {
    const sql = readFileSync(deletePolicyMigrationPath, 'utf8')
    const normalized = sql.replace(/\s+/g, ' ')

    expect(sql).toContain('ON public.user_profiles')
    expect(sql).toContain('FOR DELETE')
    expect(normalized).toMatch(/USING \(auth\.uid\(\) = id\)/)
  })

  it('keeps the households insert policy present in the consolidated migration', () => {
    const sql = readFileSync(consolidatedPolicyPath, 'utf8')
    const normalized = sql.replace(/\s+/g, ' ')

    expect(normalized).toContain(
      'CREATE POLICY "Users can create households" ON households FOR INSERT WITH CHECK (auth.uid() = created_by);'
    )
  })
})
