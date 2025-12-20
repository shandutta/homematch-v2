import { createClient } from '@supabase/supabase-js'
import { describe, test, expect, beforeAll } from 'vitest'
import crypto from 'node:crypto'
import { UserService } from '@/lib/services/users'
import type { Database } from '@/types/database'

describe('User saved searches integration', () => {
  let userService: UserService
  let supabase: ReturnType<typeof createClient<Database>>
  let existingUserId: string | null = null
  let existingHouseholdId: string | null = null

  beforeAll(async () => {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54200'
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseKey) {
      throw new Error('Missing Supabase key for integration tests')
    }

    supabase = createClient<Database>(supabaseUrl, supabaseKey)
    const clientFactory = { createClient: async () => supabase }
    userService = new UserService(clientFactory)

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, household_id')
      .limit(1)

    if (profiles && profiles.length > 0) {
      existingUserId = profiles[0].id
      existingHouseholdId = profiles[0].household_id || null
    }
  })

  test('creates and retrieves a saved search', async () => {
    if (!existingUserId) {
      console.log('Skipping: no existing user found')
      return
    }

    const runId = crypto.randomUUID().slice(0, 8)
    const name = `Integration Search ${runId}`

    const created = await userService.createSavedSearch({
      user_id: existingUserId,
      household_id: existingHouseholdId,
      name,
      filters: {
        location: 'Integration Test',
        priceMin: 250000,
        priceMax: 850000,
        bedrooms: 3,
        notifications: true,
      },
      is_active: true,
    })

    expect(created).not.toBeNull()
    expect(created?.name).toBe(name)

    const searches = await userService.getUserSavedSearches(existingUserId)
    const match = searches.find((search) => search.id === created?.id)
    expect(match).toBeDefined()

    if (created?.id) {
      await userService.deleteSavedSearch(created.id)
    }
  })
})
