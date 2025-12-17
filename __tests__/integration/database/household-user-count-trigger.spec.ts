import { randomUUID } from 'crypto'
import { describe, expect, test } from 'vitest'
import { IntegrationTestHelper } from '../../utils/integration-test-helper'

const TEST_TIMEOUT = 60000

describe('DB: households.user_count sync trigger', () => {
  test(
    'updates households.user_count when user_profiles.household_id changes',
    async () => {
      const helper = new IntegrationTestHelper()
      const serviceClient = helper.getServiceClient()

      const test1 = await helper.getTestUser('test1@example.com')
      const test2 = await helper.getTestUser('test2@example.com')

      const householdId = randomUUID()

      const { data: existingProfiles, error: existingProfilesError } =
        await serviceClient
          .from('user_profiles')
          .select('id, household_id')
          .in('id', [test1.id, test2.id])

      expect(existingProfilesError).toBeNull()

      const originalHouseholdByUserId = new Map<string, string | null>(
        (existingProfiles ?? []).map((row) => [
          row.id,
          row.household_id ?? null,
        ])
      )

      try {
        // Create a household with an intentionally incorrect user_count.
        const { error: createHouseholdError } = await serviceClient
          .from('households')
          .insert({
            id: householdId,
            name: `Trigger Sync ${householdId.slice(0, 8)}`,
            created_by: test1.id,
            user_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        expect(createHouseholdError).toBeNull()

        // Link both users to the household; trigger should correct user_count to 2.
        const { error: linkProfilesError } = await serviceClient
          .from('user_profiles')
          .update({ household_id: householdId })
          .in('id', [test1.id, test2.id])

        expect(linkProfilesError).toBeNull()

        const { data: household, error: householdError } = await serviceClient
          .from('households')
          .select('user_count')
          .eq('id', householdId)
          .single()

        expect(householdError).toBeNull()
        expect(household?.user_count).toBe(2)
      } finally {
        // Restore original household memberships and cleanup the test household.
        await serviceClient
          .from('user_profiles')
          .update({
            household_id: originalHouseholdByUserId.get(test1.id) ?? null,
          })
          .eq('id', test1.id)

        await serviceClient
          .from('user_profiles')
          .update({
            household_id: originalHouseholdByUserId.get(test2.id) ?? null,
          })
          .eq('id', test2.id)

        await serviceClient.from('households').delete().eq('id', householdId)
      }
    },
    TEST_TIMEOUT
  )
})
