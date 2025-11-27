import { beforeAll, afterEach, describe, expect, it } from 'vitest'
import { IntegrationTestHelper } from '../../utils/integration-test-helper'
import { randomUUID } from 'crypto'

const TEST_EMAIL = process.env.TEST_USER_1_EMAIL || 'test1@example.com'
const TEST_PASSWORD = process.env.TEST_USER_1_PASSWORD || 'testpassword123'

describe('Household creation RLS', () => {
  const helper = new IntegrationTestHelper()
  const serviceClient = helper.getServiceClient()
  let testUserId: string
  const createdHouseholdIds: string[] = []

  beforeAll(async () => {
    const testUser = await helper.getTestUser(TEST_EMAIL)
    testUserId = testUser.id
  })

  afterEach(async () => {
    if (createdHouseholdIds.length > 0) {
      await serviceClient
        .from('households')
        .delete()
        .in('id', createdHouseholdIds)
      createdHouseholdIds.length = 0
    }

    if (testUserId) {
      await serviceClient
        .from('user_profiles')
        .update({ household_id: null })
        .eq('id', testUserId)
    }

    await helper.cleanup({ deleteHouseholds: false, deleteProperties: false })
  })

  it('rejects insert without created_by under RLS', async () => {
    const client = await helper.authenticateAs(TEST_EMAIL, TEST_PASSWORD)

    // Attempt to create without created_by should be blocked by policy
    const { error } = await client
      .from('households')
      .insert({ name: 'RLS Blocked Household' })
      .select()
      .single()

    const message = error?.message?.toLowerCase() || ''
    expect(error).toBeTruthy()
    expect(message).toContain('row-level security')
  })

  it('allows insert when created_by matches auth user', async () => {
    // Ensure the profile is clear before creating a new household
    await serviceClient
      .from('user_profiles')
      .update({ household_id: null })
      .eq('id', testUserId)

    const client = await helper.authenticateAs(TEST_EMAIL, TEST_PASSWORD)
    const householdId = randomUUID()

    const { error } = await client
      .from('households')
      .insert({
        id: householdId,
        name: 'RLS Allowed Household',
        created_by: testUserId,
      })

    expect(error).toBeNull()
    createdHouseholdIds.push(householdId)

    // Verify via service role (bypasses select RLS that requires membership)
    const { data: householdRecord, error: fetchError } = await serviceClient
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single()

    expect(fetchError).toBeNull()
    expect(householdRecord?.created_by).toBe(testUserId)

    // Join the household to mirror app behavior and verify profile update works under RLS
    const { data: profile, error: profileError } = await client
      .from('user_profiles')
      .update({ household_id: householdId })
      .eq('id', testUserId)
      .select()
      .single()

    expect(profileError).toBeNull()
    expect(profile?.household_id).toBe(householdId)
  })
})
