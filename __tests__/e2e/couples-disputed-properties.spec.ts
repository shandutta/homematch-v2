/**
 * Couples disputed properties E2E
 *
 * Minimal mocking: uses real Next.js UI + real Supabase via service role for setup/verification.
 *
 * Covers:
 * - DisputedPropertiesAlert appears on /couples when partners disagree
 * - /couples/decisions lists the disputed property
 * - Resolving a dispute persists across reloads (no reappearing disagreements)
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { createWorkerAuthHelper } from '../utils/auth-helper'
import { getWorkerTestUser } from '../fixtures/test-data'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function createServiceRoleClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'http://127.0.0.1:54200'
  const serviceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function getAuthUserIdByEmail(
  supabase: ReturnType<typeof createServiceRoleClient>,
  email: string
): Promise<string> {
  const perPage = 200
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })
    if (error) throw new Error(error.message)

    const user = data.users.find((u) => u.email === email)
    if (user) return user.id

    if (data.users.length < perPage) break
  }

  throw new Error(`Test user not found in auth: ${email}`)
}

async function seedNeighborhoodAndProperty(
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<{ neighborhoodId: string; propertyId: string; address: string }> {
  const propertyId = crypto.randomUUID()
  const neighborhoodId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const address = `Playwright Dispute ${propertyId.slice(0, 8)}`

  const neighborhoodRecord = {
    id: neighborhoodId,
    name: `Playwright Neighborhood ${neighborhoodId.slice(0, 8)}`,
    city: 'San Francisco',
    state: 'CA',
    metro_area: 'Bay Area',
    bounds: null,
    median_price: 1500000,
    walk_score: 92,
    transit_score: 80,
    created_at: createdAt,
  }

  const { error: neighborhoodError } = await supabase
    .from('neighborhoods')
    .upsert(neighborhoodRecord)

  if (neighborhoodError) {
    throw new Error(`Failed to seed neighborhood: ${neighborhoodError.message}`)
  }

  const propertyRecord = {
    id: propertyId,
    address,
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94103',
    price: 1250000,
    bedrooms: 3,
    bathrooms: 2,
    square_feet: 1540,
    lot_size_sqft: null,
    parking_spots: 1,
    property_type: 'single_family',
    listing_status: 'for_sale',
    description: 'E2E seeded property for couples dispute flow',
    images: [],
    coordinates: { type: 'Point', coordinates: [-122.4194, 37.7749] },
    neighborhood_id: neighborhoodId,
    property_hash: crypto
      .createHash('md5')
      .update(`${address}-${createdAt}`)
      .digest('hex'),
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  }

  const { error: propertyError } = await supabase
    .from('properties')
    .upsert(propertyRecord)

  if (propertyError) {
    throw new Error(`Failed to seed property: ${propertyError.message}`)
  }

  return { neighborhoodId, propertyId, address }
}

test.describe('Couples disputed properties (real UI)', () => {
  test('alert → decisions → resolve persists across reload', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000)

    const service = createServiceRoleClient()

    const partner1User = getWorkerTestUser(testInfo.workerIndex)
    const partner2User = getWorkerTestUser((testInfo.workerIndex + 4) % 8)

    const [partner1Id, partner2Id] = await Promise.all([
      getAuthUserIdByEmail(service, partner1User.email),
      getAuthUserIdByEmail(service, partner2User.email),
    ])

    const { data: startingProfiles, error: startingProfilesError } =
      await service
        .from('user_profiles')
        .select('id, household_id, preferences')
        .in('id', [partner1Id, partner2Id])

    if (startingProfilesError || !startingProfiles) {
      throw new Error(
        startingProfilesError?.message || 'Failed to load user profiles'
      )
    }

    const startingProfileById = new Map(
      startingProfiles.map((profile) => [profile.id, profile])
    )

    const cleanupFailures: string[] = []
    const safeCleanup = async (label: string, fn: () => Promise<void>) => {
      try {
        await fn()
      } catch (err) {
        cleanupFailures.push(
          `${label}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    const householdId = crypto.randomUUID()
    let propertyId: string | null = null
    let neighborhoodId: string | null = null
    let propertyAddress: string | null = null

    try {
      await service
        .from('user_profiles')
        .update({ household_id: null, preferences: null })
        .in('id', [partner1Id, partner2Id])

      const now = new Date().toISOString()
      await service.from('households').insert({
        id: householdId,
        name: `PW Dispute ${householdId.slice(0, 8)}`,
        created_by: partner1Id,
        user_count: 0,
        created_at: now,
        updated_at: now,
      })

      await service
        .from('user_profiles')
        .update({ household_id: householdId })
        .in('id', [partner1Id, partner2Id])

      const seeded = await seedNeighborhoodAndProperty(service)
      propertyId = seeded.propertyId
      neighborhoodId = seeded.neighborhoodId
      propertyAddress = seeded.address

      await service.from('user_property_interactions').insert([
        {
          user_id: partner1Id,
          household_id: householdId,
          property_id: propertyId,
          interaction_type: 'like',
          created_at: new Date(Date.now() - 1000).toISOString(),
        },
        {
          user_id: partner2Id,
          household_id: householdId,
          property_id: propertyId,
          interaction_type: 'dislike',
          created_at: new Date().toISOString(),
        },
      ])

      const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
      await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
      await auth.verifyAuthenticated()

      await page.goto('/couples', { waitUntil: 'domcontentloaded' })

      await expect(page.getByText(/properties need discussion/i)).toBeVisible({
        timeout: 30000,
      })

      const resolveButton = page.getByRole('button', { name: /resolve/i })
      await Promise.all([
        page.waitForURL('**/couples/decisions'),
        resolveButton.click(),
      ])

      await expect(page.getByText(/properties to discuss/i)).toBeVisible({
        timeout: 30000,
      })
      await expect(page.getByText(propertyAddress!)).toBeVisible({
        timeout: 30000,
      })

      const patchResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/couples/disputed') &&
          response.request().method() === 'PATCH',
        { timeout: 20000 }
      )

      await page.getByRole('button', { name: /^discuss$/i }).click()

      const patchResponse = await patchResponsePromise
      if (!patchResponse.ok()) {
        const body = await patchResponse.text().catch(() => '')
        throw new Error(
          `Failed to resolve dispute (status ${patchResponse.status()}): ${body}`
        )
      }

      await expect(page.getByText(/no disputed properties/i)).toBeVisible({
        timeout: 30000,
      })

      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/no disputed properties/i)).toBeVisible({
        timeout: 30000,
      })

      await page.goto('/couples', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/properties need discussion/i)).toHaveCount(0)
    } finally {
      if (propertyId) {
        await safeCleanup('delete resolutions', async () => {
          await service
            .from('household_property_resolutions')
            .delete()
            .eq('household_id', householdId)
            .eq('property_id', propertyId!)
        })

        await safeCleanup('delete interactions', async () => {
          await service
            .from('user_property_interactions')
            .delete()
            .eq('household_id', householdId)
            .eq('property_id', propertyId!)
        })

        await safeCleanup('delete property', async () => {
          await service.from('properties').delete().eq('id', propertyId!)
        })
      }

      if (neighborhoodId) {
        await safeCleanup('delete neighborhood', async () => {
          await service.from('neighborhoods').delete().eq('id', neighborhoodId!)
        })
      }

      await safeCleanup('restore partner1 profile', async () => {
        const profile = startingProfileById.get(partner1Id)
        await service
          .from('user_profiles')
          .update({
            household_id: profile?.household_id ?? null,
            preferences: profile?.preferences ?? null,
          })
          .eq('id', partner1Id)
      })

      await safeCleanup('restore partner2 profile', async () => {
        const profile = startingProfileById.get(partner2Id)
        await service
          .from('user_profiles')
          .update({
            household_id: profile?.household_id ?? null,
            preferences: profile?.preferences ?? null,
          })
          .eq('id', partner2Id)
      })

      await safeCleanup('delete household', async () => {
        await service.from('households').delete().eq('id', householdId)
      })

      if (cleanupFailures.length) {
        console.warn(
          '[Couples Disputes] Cleanup warnings:\n' + cleanupFailures.join('\n')
        )
      }
    }
  })
})
