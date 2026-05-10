/**
 * @jest-environment node
 */

// Phase 0/1 closure: P1-property-stats-rpc
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260508022000_add_jsonb_gin_indexes.sql'
)

describe('JSONB GIN index migration', () => {
  const migration = () =>
    readFileSync(migrationPath, 'utf8').replace(/\s+/g, ' ')

  it('adds GIN indexes for audited JSONB query surfaces', () => {
    const sql = migration()

    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_gin ON public.user_profiles USING gin (preferences);'
    )
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_user_property_interactions_score_data_gin ON public.user_property_interactions USING gin (score_data);'
    )
    expect(sql).toContain(
      'CREATE INDEX IF NOT EXISTS idx_saved_searches_filters_gin ON public.saved_searches USING gin (filters);'
    )
  })
})
