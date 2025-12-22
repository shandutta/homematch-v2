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

test.describe('Mobile swipe card modal', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('opens the property modal from a mobile swipe card', async ({
    page,
  }) => {
    const supabase = createServiceRoleClient()
    const propertyId = crypto.randomUUID()
    const createdAt = new Date(Date.now() + 60_000).toISOString()
    const address = `Playwright Mobile Tap ${propertyId.slice(0, 8)}`

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
      description: 'Playwright seeded property for mobile modal verification.',
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt,
    }

    try {
      const { error: insertPropertyError } = await supabase
        .from('properties')
        .insert(propertyRecord)
      if (insertPropertyError) throw new Error(insertPropertyError.message)

      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(TEST_ROUTES.app.dashboard, {
        waitUntil: 'domcontentloaded',
      })

      const tapTarget = page
        .locator('[data-testid="swipe-card-tap-target"]')
        .first()
      await expect(tapTarget).toBeVisible({ timeout: 15000 })
      await expect(
        tapTarget.locator('[data-testid="property-card"]')
      ).toContainText(address)

      await tapTarget.click({ force: true })

      await expect(
        page.locator('[data-testid="property-detail-scroll"]')
      ).toBeVisible({ timeout: 15000 })
      await expect(page.locator('[data-testid="image-counter"]')).toBeVisible()
    } finally {
      await supabase.from('properties').delete().eq('id', propertyId)
    }
  })
})
