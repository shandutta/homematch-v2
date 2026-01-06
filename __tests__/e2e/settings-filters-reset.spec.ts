import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { TEST_ROUTES } from '../fixtures/test-data'
import { createWorkerAuthHelper } from '../utils/auth-helper'
import { waitForHydration } from '../utils/hydration'
import { maybeClickWhenReady } from '../utils/uiActions'

const DEFAULT_PRICE_RANGE: [number, number] = [200000, 800000]
const DEFAULT_BEDROOMS = 2
const DEFAULT_BATHROOMS = 2
const DEFAULT_SEARCH_RADIUS = 10

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

test.describe('Settings filter reset + dashboard impact', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('clears filters and updates dashboard results', async ({
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

    const city = `PW Filters ${runId}`
    const state = 'CA'

    const neighborhoodPoolId = crypto.randomUUID()
    const neighborhoodLuxuryId = crypto.randomUUID()

    const propertyPoolId = crypto.randomUUID()
    const propertyLuxuryId = crypto.randomUUID()

    const addressPool = `PW Filter ${runId} Pool`
    const addressLuxury = `PW Filter ${runId} Luxury`

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
            id: neighborhoodPoolId,
            name: `PW Neighborhood ${runId} Pool`,
            city,
            state,
            bounds: null,
            created_at: createdAt,
          },
          {
            id: neighborhoodLuxuryId,
            name: `PW Neighborhood ${runId} Luxury`,
            city,
            state,
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
            id: propertyPoolId,
            address: addressPool,
            city,
            state,
            zip_code: '94103',
            price: 450000,
            bedrooms: 2,
            bathrooms: 2,
            square_feet: 950,
            property_type: 'condo',
            listing_status: 'active',
            images: ['/images/properties/house-1.svg'],
            description: 'Playwright seeded property for amenity filtering.',
            neighborhood_id: neighborhoodPoolId,
            amenities: ['Pool'],
            is_active: true,
            created_at: createdAt,
            updated_at: createdAt,
          },
          {
            id: propertyLuxuryId,
            address: addressLuxury,
            city,
            state,
            zip_code: '94110',
            price: 950000,
            bedrooms: 4,
            bathrooms: 3,
            square_feet: 2100,
            property_type: 'single_family',
            listing_status: 'active',
            images: ['/images/properties/house-2.svg'],
            description: 'Playwright seeded property for price filtering.',
            neighborhood_id: neighborhoodLuxuryId,
            amenities: ['Gym'],
            is_active: true,
            created_at: createdAt,
            updated_at: createdAt,
          },
        ])
      if (insertPropertiesError) throw new Error(insertPropertiesError.message)

      await page.goto(TEST_ROUTES.app.settings, {
        waitUntil: 'domcontentloaded',
      })
      await waitForHydration(page)

      const listViewTab = page.getByRole('tab', { name: /list view/i })
      await maybeClickWhenReady(page, listViewTab)
      await page.getByTestId('city-search').fill(runId)
      await expect(
        page.getByTestId(cityOptionTestId(city, state))
      ).toBeVisible()
      await page.getByTestId(cityOptionTestId(city, state)).click()

      await waitForUserPreferences(supabase, userId, (preferences) => {
        const cities = preferences?.cities
        return (
          Array.isArray(cities) &&
          cities.some((c: any) => c?.city === city && c?.state === state)
        )
      })

      await page.getByRole('switch', { name: /^pool$/i }).click()

      await waitForUserPreferences(supabase, userId, (preferences) => {
        return preferences?.mustHaves?.pool === true
      })

      await page.goto(TEST_ROUTES.app.dashboard, {
        waitUntil: 'domcontentloaded',
      })
      await waitForHydration(page)

      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressPool })
          .first()
      ).toBeVisible({ timeout: 15000 })

      const { error: updatePrefsError } = await supabase
        .from('user_profiles')
        .update({
          preferences: {
            priceRange: [900000, 1000000],
            bedrooms: 4,
            bathrooms: 3,
            searchRadius: DEFAULT_SEARCH_RADIUS,
            propertyTypes: {
              single_family: true,
              townhome: false,
              condo: false,
              multi_family: false,
              manufactured: false,
              land: false,
              other: false,
              house: true,
              townhouse: false,
            },
            mustHaves: {
              parking: false,
              pool: false,
              gym: false,
              petFriendly: false,
            },
            cities: [{ city, state }],
            neighborhoods: [],
          },
        })
        .eq('id', userId)
      if (updatePrefsError) throw new Error(updatePrefsError.message)

      await page.goto(TEST_ROUTES.app.dashboard, {
        waitUntil: 'domcontentloaded',
      })
      await waitForHydration(page)

      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressLuxury })
          .first()
      ).toBeVisible({ timeout: 15000 })
      await expect(
        page
          .locator('[data-testid="property-address"]')
          .filter({ hasText: addressPool })
      ).toHaveCount(0)

      await page.goto(TEST_ROUTES.app.settings, {
        waitUntil: 'domcontentloaded',
      })
      await waitForHydration(page)
      await page.getByTestId('reset-preferences').click()

      await waitForUserPreferences(supabase, userId, (preferences) => {
        const cities = preferences?.cities
        const neighborhoods = preferences?.neighborhoods
        return (
          Array.isArray(cities) &&
          cities.length === 0 &&
          Array.isArray(neighborhoods) &&
          neighborhoods.length === 0 &&
          Array.isArray(preferences?.priceRange) &&
          preferences.priceRange[0] === DEFAULT_PRICE_RANGE[0] &&
          preferences.priceRange[1] === DEFAULT_PRICE_RANGE[1] &&
          preferences.bedrooms === DEFAULT_BEDROOMS &&
          preferences.bathrooms === DEFAULT_BATHROOMS
        )
      })
    } finally {
      await supabase
        .from('properties')
        .delete()
        .in('id', [propertyPoolId, propertyLuxuryId])
      await supabase
        .from('neighborhoods')
        .delete()
        .in('id', [neighborhoodPoolId, neighborhoodLuxuryId])
      await supabase
        .from('user_profiles')
        .update({ preferences: existingProfile?.preferences ?? null })
        .eq('id', userId)
    }
  })
})
