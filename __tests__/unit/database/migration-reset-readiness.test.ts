/**
 * @jest-environment node
 */
// Phase 0/1 closure: D6-db-reset-readiness

// Phase 0/1 closure: D6-db-reset-readiness
import { readFileSync } from 'fs'
import { join } from 'path'

const repoPath = (...parts: string[]) => join(process.cwd(), ...parts)
const migration = (fileName: string) =>
  readFileSync(repoPath('supabase/migrations', fileName), 'utf8')

const phase1DbRemediationMigrations = [
  '20260507225000_add_schema_safety_constraints.sql',
  '20260508000000_add_property_stats_rpc.sql',
  '20260508001000_harden_security_definer_search_paths.sql',
  '20260508003500_fix_properties_public_select_policy.sql',
  '20260508015000_fix_interaction_uniqueness.sql',
  '20260508021000_add_user_profiles_delete_policy.sql',
  '20260508022000_add_jsonb_gin_indexes.sql',
  '20260508023000_add_realtime_mutual_like_payload_rpc.sql',
  '20260508024000_create_admin_role_assignments.sql',
]

describe('D6 static migration reset readiness', () => {
  it.each(phase1DbRemediationMigrations)(
    '%s keeps explicit rollback notes for reset/lint review',
    (fileName) => {
      expect(migration(fileName)).toMatch(/--\s*DOWN:/i)
    }
  )

  it.each(phase1DbRemediationMigrations)(
    '%s avoids migration statements that are unsafe for Supabase db reset replay',
    (fileName) => {
      const sql = migration(fileName)

      expect(sql).not.toMatch(/create\s+index\s+concurrently/i)
      expect(sql).not.toMatch(/drop\s+schema\s+public\s+cascade/i)
      expect(sql).not.toMatch(/drop\s+database/i)
      expect(sql).not.toMatch(/alter\s+system/i)
      expect(sql).not.toMatch(/\bcopy\s+[^;]+\bfrom\s+program\b/i)
    }
  )

  it('keeps local DB reset behind the Docker/local Supabase wrapper', () => {
    const packageJson = JSON.parse(
      readFileSync(repoPath('package.json'), 'utf8')
    )
    const scripts = packageJson.scripts

    expect(scripts['db:reset']).toBe('node scripts/dev-supabase-reset.js')
    expect(scripts['dev:db']).toContain(
      'pnpm run ensure:docker && pnpm run db:reset'
    )
  })

  it('does not expose a remote database reset command in package scripts', () => {
    const packageJson = JSON.parse(
      readFileSync(repoPath('package.json'), 'utf8')
    )
    const scriptText = Object.entries(packageJson.scripts)
      .map(([name, command]) => `${name}: ${command}`)
      .join('\n')

    expect(scriptText).not.toMatch(/supabase\s+db\s+reset[^\n]*--db-url/i)
    expect(scriptText).not.toMatch(
      /psql\s+[^\n]*(drop\s+database|drop\s+schema)/i
    )
  })
})
