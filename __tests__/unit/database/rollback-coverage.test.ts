// Phase 0/1 closure: DB-P1.4-rollback-down
import { readFileSync } from 'fs'
import * as path from 'path'

// Phase 0/1 closure: DB-P1.4-rollback-down

const migration = (fileName: string) =>
  readFileSync(
    path.join(process.cwd(), 'supabase/migrations', fileName),
    'utf8'
  )

describe('DB rollback/DOWN coverage for Phase 1 DB cleanup migrations', () => {
  const phase1Migrations = [
    '20260508000000_add_property_stats_rpc.sql',
    '20260508001000_harden_security_definer_search_paths.sql',
    '20260508003500_fix_properties_public_select_policy.sql',
    '20260508015000_fix_interaction_uniqueness.sql',
    '20260508021000_add_user_profiles_delete_policy.sql',
    '20260508022000_add_jsonb_gin_indexes.sql',
    '20260508023000_add_realtime_mutual_like_payload_rpc.sql',
  ]

  it.each(phase1Migrations)(
    '%s contains an explicit DOWN rollback block',
    (fileName) => {
      const sql = migration(fileName)
      expect(sql).toMatch(/--\s*DOWN:/i)
    }
  )

  it('defines the realtime mutual-like RPC with auth and household-member guards', () => {
    const sql = migration(
      '20260508023000_add_realtime_mutual_like_payload_rpc.sql'
    )

    expect(sql).toMatch(
      /create\s+or\s+replace\s+function\s+public\.get_realtime_mutual_like_payload/i
    )
    expect(sql).toMatch(/security\s+definer/i)
    expect(sql).toMatch(/where\s+auth\.uid\(\)\s*=\s*p_current_user_id/i)
    expect(sql).toMatch(
      /current_profile\.household_id\s*=\s*partner\.household_id/i
    )
    expect(sql).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.get_realtime_mutual_like_payload\(uuid,\s*uuid,\s*uuid\)\s+to\s+authenticated/i
    )
  })

  it('documents rollback for the realtime mutual-like payload RPC', () => {
    const sql = migration(
      '20260508023000_add_realtime_mutual_like_payload_rpc.sql'
    )
    expect(sql).toMatch(
      /drop\s+function\s+if\s+exists\s+public\.get_realtime_mutual_like_payload/i
    )
    expect(sql).toMatch(
      /--\s*DOWN:[\s\S]*drop\s+function\s+if\s+exists\s+public\.get_realtime_mutual_like_payload/i
    )
  })
})
