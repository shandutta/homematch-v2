import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { TEST_ROUTES } from '../fixtures/test-data'
import { createWorkerAuthHelper } from '../utils/auth-helper'

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

function cityOptionTestId(city: string, state: string) {
  const key = `${city.toLowerCase()}|${state.toLowerCase()}`
  const testIdKey = key.replace(/[^a-z0-9|]/g, '-').replace(/\|/g, '--')
  return `city-option-${testIdKey}`
}

async function fetchUserPreferences(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<any> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('id', userId)
    .single()
  if (error) throw new Error(error.message)
  return data?.preferences ?? null
}

async function waitForUserPreferences(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  predicate: (preferences: any) => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<any> {
  const timeoutMs = options.timeoutMs ?? 15_000
  const intervalMs = options.intervalMs ?? 500
  const start = Date.now()

  let lastPreferences: any = null

  while (Date.now() - start < timeoutMs) {
    lastPreferences = await fetchUserPreferences(supabase, userId)
    if (predicate(lastPreferences)) return lastPreferences
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(
    `Timed out waiting for preferences update. Last preferences: ${JSON.stringify(
      lastPreferences
    )}`
  )
}

test.describe('Settings location preferences', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('multi-city + multi-neighborhood settings filter dashboard', async ({
    page,
  }, testInfo) => {
    const supabase = createServiceRoleClient()
    const { testUser } = createWorkerAuthHelper(page, testInfo)
    const userId = await getAuthUserIdByEmail(supabase, testUser.email)

    const { data: existingProfile, error: existingProfileError } =
      await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', userId)
        .single()
    if (existingProfileError) throw new Error(existingProfileError.message)

    const runId = crypto.randomUUID().slice(0, 8)
    const createdAt = new Date().toISOString()

    const cityA = `PW City ${runId} A`
    const stateA = 'CA'
    const cityB = `PW City ${runId} B`
    const stateB = 'TX'
    const cityC = `PW City ${runId} C`
    const stateC = 'CA'

    const neighborhoodA1Id = crypto.randomUUID()
    const neighborhoodA2Id = crypto.randomUUID()
    const neighborhoodB1Id = crypto.randomUUID()
    const neighborhoodC1Id = crypto.randomUUID()

    const neighborhoodA1Name = `PW Neighborhood ${runId} A1`
    const neighborhoodA2Name = `PW Neighborhood ${runId} A2`
    const neighborhoodB1Name = `PW Neighborhood ${runId} B1`
    const neighborhoodC1Name = `PW Neighborhood ${runId} C1`

    const propertyA1Id = crypto.randomUUID()
    const propertyA2Id = crypto.randomUUID()
    const propertyB1Id = crypto.randomUUID()
    const propertyC1Id = crypto.randomUUID()

    const addressA1 = `PW Location Pref ${runId} A1`
    const addressA2 = `PW Location Pref ${runId} A2`
    const addressB1 = `PW Location Pref ${runId} B1`
    const addressC1 = `PW Location Pref ${runId} C1`

    try {
      const { error: resetPrefsError } = await supabase
        .from('user_profiles')
        .update({ preferences: null })
        .eq('id', userId)
      if (resetPrefsError) throw new Error(resetPrefsError.message)

      const { error: insertNeighborhoodsError } = await supabase
        .from('neighborhoods')
        .insert([
          {
            id: neighborhoodA1Id,
            name: neighborhoodA1Name,
            city: cityA,
            state: stateA,
            bounds: null,
            created_at: createdAt,
          },
          {
            id: neighborhoodA2Id,
            name: neighborhoodA2Name,
            city: cityA,
            state: stateA,
            bounds: null,
            created_at: createdAt,
          },
          {
            id: neighborhoodB1Id,
            name: neighborhoodB1Name,
            city: cityB,
            state: stateB,
            bounds: null,
            created_at: createdAt,
          },
          {
            id: neighborhoodC1Id,
            name: neighborhoodC1Name,
            city: cityC,
            state: stateC,
            bounds: null,
            created_at: createdAt,
          },
        ])
      if (insertNeighborhoodsError)
        throw new Error(insertNeighborhoodsError.message)

      const { error: insertPropertiesError } = await supabase
        .from('properties')
        .insert([
          {
            id: propertyA1Id,
            address: addressA1,
            city: cityA,
            state: stateA,
            zip_code: '94103',
            price: 425000,
            bedrooms: 2,
            bathrooms: 2,
            square_feet: 950,
            property_type: 'single_family',
            listing_status: 'active',
            images: ['/images/properties/house-1.svg'],
            description:
              'Playwright seeded property for location preferences verification.',
            neighborhood_id: neighborhoodA1Id,
            is_active: true,
            created_at: createdAt,
            updated_at: createdAt,
          },
          {
            id: propertyA2Id,
            address: addressA2,
            city: cityA,
            state: stateA,
            zip_code: '94107',
            price: 515000,
            bedrooms: 3,
            bathrooms: 2,
            square_feet: 1250,
            property_type: 'condo',
            listing_status: 'active',
            images: ['/images/properties/house-2.svg'],
            description:
              'Playwright seeded property for location preferences verification.',
            neighborhood_id: neighborhoodA2Id,
            is_active: true,
            created_at: createdAt,
            updated_at: createdAt,
          },
          {
            id: propertyB1Id,
            address: addressB1,
            city: cityB,
            state: stateB,
            zip_code: '73301',
            price: 605000,
            bedrooms: 4,
            bathrooms: 3,
            square_feet: 2100,
            property_type: 'single_family',
            listing_status: 'active',
            images: ['/images/properties/house-3.svg'],
            description:
              'Playwright seeded property for location preferences verification.',
            neighborhood_id: neighborhoodB1Id,
            is_active: true,
            created_at: createdAt,
            updated_at: createdAt,
          },
          {
            id: propertyC1Id,
            address: addressC1,
            city: cityC,
            state: stateC,
            zip_code: '94110',
            price: 455000,
            bedrooms: 2,
            bathrooms: 2,
            square_feet: 1050,
            property_type: 'townhome',
            listing_status: 'active',
            images: ['/images/properties/house-1.svg'],
            description:
              'Playwright seeded property for location preferences verification.',
            neighborhood_id: neighborhoodC1Id,
            is_active: true,
            created_at: createdAt,
            updated_at: createdAt,
          },
        ])
      if (insertPropertiesError) throw new Error(insertPropertiesError.message)

      // Phase 1: cities only (no neighborhood picks)
      await page.goto(TEST_ROUTES.app.settings, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByRole('tab', { name: /list view/i }).click()
      await expect(page.getByTestId('city-search')).toBeVisible()

      await page.getByTestId('city-search').fill(runId)
      await expect(
        page.getByTestId(cityOptionTestId(cityA, stateA))
      ).toBeVisible()
      await expect(
        page.getByTestId(cityOptionTestId(cityB, stateB))
      ).toBeVisible()

      await page.getByTestId(cityOptionTestId(cityA, stateA)).click()
      await page.getByTestId(cityOptionTestId(cityB, stateB)).click()

      await waitForUserPreferences(supabase, userId, (preferences) => {
        const cities = preferences?.cities
        const neighborhoods = preferences?.neighborhoods

        return (
          Array.isArray(cities) &&
          cities.some((c: any) => c?.city === cityA && c?.state === stateA) &&
          cities.some((c: any) => c?.city === cityB && c?.state === stateB) &&
          Array.isArray(neighborhoods) &&
          neighborhoods.includes(neighborhoodA1Id) &&
          neighborhoods.includes(neighborhoodA2Id) &&
          neighborhoods.includes(neighborhoodB1Id)
        )
      })

      await page.goto(TEST_ROUTES.app.dashboard, {
        waitUntil: 'domcontentloaded',
      })

      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressA1 })
          .first()
      ).toBeVisible({ timeout: 15000 })
      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressA2 })
          .first()
      ).toBeVisible()
      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressB1 })
          .first()
      ).toBeVisible()
      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressC1 })
      ).toHaveCount(0)

      // Phase 2: neighborhoods override cities
      await page.goto(TEST_ROUTES.app.settings, {
        waitUntil: 'domcontentloaded',
      })
      await page.getByRole('tab', { name: /list view/i }).click()
      await expect(page.getByTestId('neighborhood-search')).toBeVisible()

      await expect(
        page.getByTestId(`neighborhood-option-${neighborhoodA1Id}`)
      ).toBeVisible({ timeout: 15000 })
      await expect(
        page.getByTestId(`neighborhood-option-${neighborhoodB1Id}`)
      ).toBeVisible()

      const clearButtons = page.getByRole('button', { name: 'Clear' })
      await clearButtons.nth(1).click()

      await page.getByTestId(`neighborhood-option-${neighborhoodA1Id}`).click()
      await page.getByTestId(`neighborhood-option-${neighborhoodB1Id}`).click()

      await waitForUserPreferences(supabase, userId, (preferences) => {
        const neighborhoods = preferences?.neighborhoods

        return (
          Array.isArray(neighborhoods) &&
          neighborhoods.includes(neighborhoodA1Id) &&
          neighborhoods.includes(neighborhoodB1Id) &&
          !neighborhoods.includes(neighborhoodA2Id)
        )
      })

      await page.goto(TEST_ROUTES.app.dashboard, {
        waitUntil: 'domcontentloaded',
      })

      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressA1 })
          .first()
      ).toBeVisible({ timeout: 15000 })
      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressB1 })
          .first()
      ).toBeVisible()

      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressA2 })
      ).toHaveCount(0)
      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressC1 })
      ).toHaveCount(0)
    } finally {
      await supabase
        .from('properties')
        .delete()
        .in('id', [propertyA1Id, propertyA2Id, propertyB1Id, propertyC1Id])
      await supabase
        .from('neighborhoods')
        .delete()
        .in('id', [
          neighborhoodA1Id,
          neighborhoodA2Id,
          neighborhoodB1Id,
          neighborhoodC1Id,
        ])
      await supabase
        .from('user_profiles')
        .update({ preferences: existingProfile?.preferences ?? null })
        .eq('id', userId)
    }
  })
})
