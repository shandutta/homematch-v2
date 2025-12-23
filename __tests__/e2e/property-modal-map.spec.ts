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

test.describe('Property modal map', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('renders the map without showing fallback errors', async ({
    page,
  }, testInfo) => {
    getRequiredEnv('GOOGLE_MAPS_SERVER_API_KEY')

    const supabase = createServiceRoleClient()
    const { testUser } = createWorkerAuthHelper(page, testInfo)
    const userId = await getAuthUserIdByEmail(supabase, testUser.email)

    const propertyId = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const address = `Playwright Map Test ${propertyId.slice(0, 8)}`

    const propertyRecord = {
      id: propertyId,
      address,
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94103',
      price: 425000,
      bedrooms: 2,
      bathrooms: 1,
      square_feet: 950,
      property_type: 'single_family',
      listing_status: 'active',
      images: ['/images/properties/house-1.svg'],
      description: 'Playwright seeded property for modal map verification.',
      coordinates: { type: 'Point', coordinates: [-122.4194, 37.7749] },
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt,
    }

    try {
      const { error: insertPropertyError } = await supabase
        .from('properties')
        .insert(propertyRecord)
      if (insertPropertyError) throw new Error(insertPropertyError.message)

      const { error: insertInteractionError } = await supabase
        .from('user_property_interactions')
        .insert({
          user_id: userId,
          property_id: propertyId,
          interaction_type: 'like',
          created_at: createdAt,
        })
      if (insertInteractionError)
        throw new Error(insertInteractionError.message)

      await page.goto(`${TEST_ROUTES.app.dashboard}/liked`, {
        waitUntil: 'domcontentloaded',
      })

      const propertyCard = page
        .locator('[data-testid="property-card"]')
        .filter({ hasText: address })
        .first()

      await expect(propertyCard).toBeVisible({ timeout: 15000 })
      await propertyCard.click({ force: true })

      await expect(
        page.locator('[data-testid="property-detail-scroll"]')
      ).toBeVisible({ timeout: 15000 })

      const locationHeading = page.getByRole('heading', { name: 'Location' })
      await locationHeading.scrollIntoViewIfNeeded()

      const map = page.locator('[data-testid="property-map"]')
      await expect(map).toBeVisible({ timeout: 15000 })

      await page.waitForFunction(() => Boolean(window.google?.maps), null, {
        timeout: 15000,
      })

      await expect(map.locator('.gm-style')).toBeVisible({ timeout: 15000 })
      await expect(map).not.toContainText(/map unavailable/i)
    } finally {
      await supabase
        .from('user_property_interactions')
        .delete()
        .match({ user_id: userId, property_id: propertyId })
      await supabase.from('properties').delete().eq('id', propertyId)
    }
  })
})
