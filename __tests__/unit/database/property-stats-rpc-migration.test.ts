/**
 * @jest-environment node
 */
// Phase 0/1 closure: P1-property-stats-rpc

// Phase 0/1 closure: P1-property-stats-rpc
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260508000000_add_property_stats_rpc.sql'
)

describe('property stats RPC migration', () => {
  const migration = () => readFileSync(migrationPath, 'utf8')

  it('creates a DB-side aggregation RPC without returning raw property rows', () => {
    const sql = migration()

    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION\s+public\.get_property_stats\s*\(\s*\)/i
    )
    expect(sql).toMatch(/RETURNS TABLE\s*\(/i)
    expect(sql).toMatch(/COUNT\(\*\)::integer AS total_properties/i)
    expect(sql).toMatch(
      /percentile_cont\(0\.5\) WITHIN GROUP \(ORDER BY price\)/i
    )
    expect(sql).toMatch(/jsonb_object_agg\(property_type, type_count\)/i)
    expect(sql).toMatch(/WHERE is_active IS TRUE/i)
    expect(sql).toMatch(/AND listing_status = 'active'/i)
    expect(sql).not.toMatch(/RETURNS SETOF\s+properties/i)
  })
})
