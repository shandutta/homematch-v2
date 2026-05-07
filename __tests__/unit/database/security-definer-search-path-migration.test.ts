/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20260508001000_harden_security_definer_search_paths.sql'
)

const expectedSecurityDefinerFunctions = [
  'handle_new_user',
  'get_properties_in_bounds',
  'get_walkability_score',
  'get_transit_score',
  'get_properties_by_distance',
  'get_neighborhoods_in_bounds',
  'get_property_clusters',
  'get_properties_in_polygon',
  'get_properties_along_route',
  'get_geographic_density',
  'get_nearest_amenities',
  'backfill_property_neighborhoods',
  'backfill_property_coordinates_city_centroid',
]

describe('SECURITY DEFINER search_path hardening migration', () => {
  const migration = () => readFileSync(migrationPath, 'utf8')

  it('alters every audited SECURITY DEFINER function to use a safe search_path', () => {
    const sql = migration()

    for (const functionName of expectedSecurityDefinerFunctions) {
      const functionBlock = new RegExp(
        `ALTER FUNCTION\\s+(?:public\\.)?${functionName}\\s*\\([\\s\\S]*?\\)\\s+SET search_path = pg_catalog, public`,
        'i'
      )

      expect(sql).toMatch(functionBlock)
    }
  })

  it('does not rely on destructive function replacement for metadata-only hardening', () => {
    const sql = migration()
    const alterFunctionCount = (sql.match(/ALTER FUNCTION/gi) ?? []).length
    const createOrReplaceCount = (
      sql.match(/CREATE OR REPLACE FUNCTION/gi) ?? []
    ).length
    const hardenedSearchPathCount = (
      sql.match(/SET search_path = pg_catalog, public/gi) ?? []
    ).length

    expect(createOrReplaceCount).toBe(0)
    expect(alterFunctionCount).toBe(expectedSecurityDefinerFunctions.length)
    expect(hardenedSearchPathCount).toBe(
      expectedSecurityDefinerFunctions.length
    )
  })
})
