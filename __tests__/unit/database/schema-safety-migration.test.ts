/**
 * @jest-environment node
 */

// Phase 0/1 closure: D5-numeric-constraints
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260507225000_add_schema_safety_constraints.sql'
)

describe('schema safety constraints migration', () => {
  const migration = () => readFileSync(migrationPath, 'utf8')

  it('adds listing status and property numeric sanity constraints without rewriting existing rows', () => {
    const sql = migration()

    expect(sql).toContain('chk_properties_listing_status')
    expect(sql).toContain(
      "listing_status IN ('active', 'pending', 'sold', 'off_market', 'new_listing')"
    )
    expect(sql).toContain('chk_properties_price_positive')
    expect(sql).toContain('chk_properties_bedrooms_non_negative')
    expect(sql).toContain('chk_properties_bathrooms_non_negative')
    expect(sql).toContain('0 bedrooms represents studio/loft-style listings')
    expect(sql).toContain('0 bathrooms is')
    expect(sql).toContain('unknown/missing-value sentinel')
    expect(sql).toContain('CHECK (bedrooms >= 0)')
    expect(sql).toContain('CHECK (bathrooms >= 0)')
    expect(sql).not.toContain('CHECK (bedrooms > 0)')
    expect(sql).not.toContain('CHECK (bathrooms > 0)')
    expect(sql).toContain('chk_properties_square_feet_positive')
    expect(sql).toContain('chk_properties_year_built_reasonable')
    expect(sql).toContain('NOT VALID')
  })

  it('hardens property and household foreign keys to avoid dangling references', () => {
    const sql = migration()

    expect(sql).toContain('properties_neighborhood_id_fkey')
    expect(sql).toContain(
      'REFERENCES public.neighborhoods(id) ON DELETE SET NULL'
    )
    expect(sql).toContain('user_profiles_household_id_fkey')
    expect(sql).toContain('REFERENCES public.households(id) ON DELETE SET NULL')
  })
})
