/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260508015000_fix_interaction_uniqueness.sql'
)

describe('interaction uniqueness migration', () => {
  const migration = () => readFileSync(migrationPath, 'utf8')

  it('deduplicates existing user/property interaction rows before tightening uniqueness', () => {
    const sql = migration()

    expect(sql).toContain('ROW_NUMBER() OVER')
    expect(sql).toContain('PARTITION BY user_id, property_id')
    expect(sql).toContain('DELETE FROM public.user_property_interactions')
  })

  it('replaces per-interaction-type uniqueness with one interaction per user/property', () => {
    const sql = migration()

    const upSql = sql.split(/--\s*DOWN:/i)[0]

    expect(upSql).toContain(
      'DROP CONSTRAINT IF EXISTS user_property_interactions_user_id_property_id_interaction_type_key'
    )
    expect(upSql).toContain(
      'user_property_interactions_user_id_property_id_key'
    )
    expect(upSql).toContain('UNIQUE (user_id, property_id)')
    expect(upSql).not.toContain(
      'UNIQUE (user_id, property_id, interaction_type)'
    )
  })
})
