/**
 * @jest-environment node
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20251218091000_create_household_property_resolutions.sql'
)

const sql = () => readFileSync(migrationPath, 'utf8')
const normalized = () => sql().replace(/\s+/g, ' ')

describe('household_property_resolutions migration guards', () => {
  describe('table and index evidence', () => {
    it('creates the resolutions table with a household/property uniqueness key', () => {
      const text = normalized()

      expect(text).toContain(
        'CREATE TABLE IF NOT EXISTS household_property_resolutions'
      )
      expect(text).toContain('UNIQUE (household_id, property_id)')
    })

    it('creates household and property lookup indexes', () => {
      const text = normalized()

      expect(text).toContain(
        'CREATE INDEX IF NOT EXISTS idx_household_property_resolutions_household ON household_property_resolutions(household_id)'
      )
      expect(text).toContain(
        'CREATE INDEX IF NOT EXISTS idx_household_property_resolutions_property ON household_property_resolutions(property_id)'
      )
    })

    it('constrains resolution_type to the documented enum set', () => {
      const text = normalized()

      expect(text).toMatch(
        /resolution_type TEXT NOT NULL CHECK \(\s*resolution_type IN \(\s*'scheduled_viewing',\s*'saved_for_later',\s*'final_pass',\s*'discussion_needed'\s*\)\s*\)/
      )
    })
  })

  describe('RLS policy family evidence', () => {
    it('enables row level security on the table', () => {
      expect(normalized()).toContain(
        'ALTER TABLE household_property_resolutions ENABLE ROW LEVEL SECURITY'
      )
    })

    it('drops prior policies before re-creating them so the migration is idempotent', () => {
      const text = normalized()

      for (const action of ['view', 'create', 'update', 'delete']) {
        expect(text).toContain(
          `DROP POLICY IF EXISTS "Household members can ${action} property resolutions" ON household_property_resolutions`
        )
      }
    })

    it.each([
      ['view', 'FOR SELECT'],
      ['update', 'FOR UPDATE'],
      ['delete', 'FOR DELETE'],
    ])(
      'gates the %s policy on household membership via user_profiles.household_id',
      (action, clause) => {
        const text = normalized()
        const policyHeader = `CREATE POLICY "Household members can ${action} property resolutions" ON household_property_resolutions ${clause}`

        expect(text).toContain(policyHeader)
        const remainder = text.slice(text.indexOf(policyHeader))
        expect(remainder).toMatch(
          /USING \(\s*household_id IN \(\s*SELECT household_id FROM user_profiles WHERE id = auth\.uid\(\)\s*\)\s*\)/
        )
      }
    )

    it('forces the create policy to bind resolved_by to the caller and check household membership', () => {
      const text = normalized()
      const header =
        'CREATE POLICY "Household members can create property resolutions" ON household_property_resolutions FOR INSERT'

      expect(text).toContain(header)
      const remainder = text.slice(text.indexOf(header))
      expect(remainder).toMatch(
        /WITH CHECK \(\s*resolved_by = auth\.uid\(\)\s*AND household_id IN \(\s*SELECT household_id FROM user_profiles WHERE id = auth\.uid\(\)\s*\)\s*\)/
      )
    })

    it('does not expose any policy without a household-membership predicate', () => {
      const text = normalized()
      const policyMatches = text.match(
        /CREATE POLICY[\s\S]*?ON household_property_resolutions[\s\S]*?(?=CREATE POLICY|$)/g
      )

      expect(policyMatches).not.toBeNull()
      expect(policyMatches!.length).toBe(4)
      for (const policy of policyMatches!) {
        expect(policy).toContain(
          'household_id IN ( SELECT household_id FROM user_profiles WHERE id = auth.uid() )'
        )
      }
    })
  })
})
