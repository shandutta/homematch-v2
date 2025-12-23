import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
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

function generateSourceHash(property: {
  address: string
  city: string
  property_type: string | null
  bedrooms: number
  bathrooms: number
  square_feet: number | null
  price: number
  year_built: number | null
  images: string[] | null
}): string {
  const hashInput = JSON.stringify({
    address: property.address,
    city: property.city,
    property_type: property.property_type,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    square_feet: property.square_feet,
    price: property.price,
    year_built: property.year_built,
    images: property.images?.slice(0, 5),
  })
  return crypto.createHash('sha256').update(hashInput).digest('hex')
}

function generateNeighborhoodSourceHash(neighborhood: {
  name: string
  city: string
  state: string
  metro_area: string | null
  median_price: number | null
  walk_score: number | null
  transit_score: number | null
}): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        name: neighborhood.name,
        city: neighborhood.city,
        state: neighborhood.state,
        metro_area: neighborhood.metro_area,
        median_price: neighborhood.median_price,
        walk_score: neighborhood.walk_score,
        transit_score: neighborhood.transit_score,
      })
    )
    .digest('hex')
}

function createDeterministicUuid(seed: string): string {
  const hash = crypto.createHash('sha256').update(seed).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

async function seedLikedPropertyWithVibes({
  supabase,
  userId,
  seedKey,
}: {
  supabase: ReturnType<typeof createServiceRoleClient>
  userId: string
  seedKey: string
}) {
  const propertyId = createDeterministicUuid(`liked-ui:${seedKey}:property`)
  const neighborhoodId = createDeterministicUuid(
    `liked-ui:${seedKey}:neighborhood`
  )
  const createdAt = new Date().toISOString()
  const address = `Playwright UI Regression ${propertyId.slice(0, 8)}`

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

  const propertyRecord = {
    id: propertyId,
    address,
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94103',
    price: 975000,
    bedrooms: 3,
    bathrooms: 2,
    square_feet: 1680,
    property_type: 'single_family',
    listing_status: 'active',
    images: ['/images/properties/house-1.svg'],
    description: 'Playwright seeded property for UI regression coverage.',
    neighborhood_id: neighborhoodId,
    is_active: true,
    created_at: createdAt,
    updated_at: createdAt,
  }

  const sourceHash = generateSourceHash(propertyRecord)
  const neighborhoodSourceHash =
    generateNeighborhoodSourceHash(neighborhoodRecord)

  const propertyTagline = `PLAYWRIGHT_UI_TAGLINE_${propertyId.slice(0, 8)}`
  const neighborhoodTagline = `PLAYWRIGHT_UI_NEIGHBORHOOD_${neighborhoodId.slice(0, 8)}`

  await supabase
    .from('neighborhoods')
    .upsert(neighborhoodRecord, { onConflict: 'id' })

  await supabase.from('neighborhood_vibes').upsert(
    {
      neighborhood_id: neighborhoodId,
      tagline: neighborhoodTagline,
      vibe_statement:
        'A walkable pocket with quick errands and an easy commute.',
      suggested_tags: ['Walkable', 'Coffee', 'Transit'],
      neighborhood_themes: [],
      local_highlights: [],
      resident_fits: [],
      input_data: { neighborhood: { id: neighborhoodId } },
      raw_output: '{}',
      model_used: 'qwen/qwen3-vl-8b-instruct',
      source_data_hash: neighborhoodSourceHash,
      generation_cost_usd: 0,
      confidence: 0.9,
      created_at: createdAt,
      updated_at: createdAt,
    },
    { onConflict: 'neighborhood_id' }
  )

  await supabase.from('properties').upsert(propertyRecord, {
    onConflict: 'id',
  })

  await supabase.from('property_vibes').upsert(
    {
      property_id: propertyId,
      tagline: propertyTagline,
      vibe_statement:
        'A bright, calm home that feels ready for both workdays and weekend hosting.',
      suggested_tags: [
        "Chef's Kitchen",
        'Remote Work Ready',
        'Open Concept Flow',
      ],
      feature_highlights: [],
      lifestyle_fits: [
        {
          category: 'Remote Work Ready',
          score: 0.92,
          tier: 'perfect',
          reason: 'An easy office-ready layout for focus and video calls.',
        },
      ],
      primary_vibes: [],
      aesthetics: {
        lightingQuality: 'natural_abundant',
        colorPalette: ['warm white', 'light oak'],
        architecturalStyle: 'Modern',
        overallCondition: 'pristine',
      },
      images_analyzed: ['/images/properties/house-1.svg'],
      input_data: { property: { address }, images: [] },
      raw_output: '{}',
      model_used: 'qwen/qwen3-vl-8b-instruct',
      source_data_hash: sourceHash,
      generation_cost_usd: 0,
      confidence: 0.9,
      created_at: createdAt,
      updated_at: createdAt,
    },
    { onConflict: 'property_id' }
  )

  await supabase.from('user_property_interactions').upsert(
    {
      user_id: userId,
      property_id: propertyId,
      interaction_type: 'like',
      created_at: createdAt,
    },
    { onConflict: 'user_id,property_id,interaction_type' }
  )

  return {
    address,
    propertyId,
    neighborhoodId,
    cleanup: async () => {
      await supabase
        .from('user_property_interactions')
        .delete()
        .match({ user_id: userId, property_id: propertyId })
      await supabase
        .from('property_vibes')
        .delete()
        .eq('property_id', propertyId)
      await supabase
        .from('neighborhood_vibes')
        .delete()
        .eq('neighborhood_id', neighborhoodId)
      await supabase.from('properties').delete().eq('id', propertyId)
      await supabase.from('neighborhoods').delete().eq('id', neighborhoodId)
    },
  }
}

test.describe('UI regressions', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('shows CTA footer only on /dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', {
        name: 'Finish decisions later without losing the vibe.',
      })
    ).toBeVisible()

    await page.goto('/dashboard/liked', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByRole('heading', {
        name: 'Finish decisions later without losing the vibe.',
      })
    ).toHaveCount(0)
  })

  test('marks the active header link via aria-current', async ({ page }) => {
    const viewedLink = page.getByRole('link', { name: 'Viewed' })
    const likedLink = page.getByRole('link', { name: 'Liked' })
    const passedLink = page.getByRole('link', { name: 'Passed' })
    const matchesLink = page.getByRole('link', { name: 'Matches' })

    await page.goto('/dashboard/viewed', { waitUntil: 'domcontentloaded' })
    await expect(viewedLink).toHaveAttribute('aria-current', 'page')
    await expect(likedLink).not.toHaveAttribute('aria-current', 'page')
    await expect(passedLink).not.toHaveAttribute('aria-current', 'page')
    await expect(matchesLink).not.toHaveAttribute('aria-current', 'page')

    await page.goto('/dashboard/liked', { waitUntil: 'domcontentloaded' })
    await expect(likedLink).toHaveAttribute('aria-current', 'page')
    await expect(viewedLink).not.toHaveAttribute('aria-current', 'page')
    await expect(passedLink).not.toHaveAttribute('aria-current', 'page')
    await expect(matchesLink).not.toHaveAttribute('aria-current', 'page')

    await page.goto('/dashboard/passed', { waitUntil: 'domcontentloaded' })
    await expect(passedLink).toHaveAttribute('aria-current', 'page')
    await expect(viewedLink).not.toHaveAttribute('aria-current', 'page')
    await expect(likedLink).not.toHaveAttribute('aria-current', 'page')
    await expect(matchesLink).not.toHaveAttribute('aria-current', 'page')

    await page.goto('/couples', { waitUntil: 'domcontentloaded' })
    await expect(matchesLink).toHaveAttribute('aria-current', 'page')
    await expect(viewedLink).not.toHaveAttribute('aria-current', 'page')
    await expect(likedLink).not.toHaveAttribute('aria-current', 'page')
    await expect(passedLink).not.toHaveAttribute('aria-current', 'page')
  })

  test('closes the property modal on Escape and restores focus', async ({
    page,
  }, testInfo) => {
    const supabase = createServiceRoleClient()
    const { testUser } = createWorkerAuthHelper(page, testInfo)
    const userId = await getAuthUserIdByEmail(supabase, testUser.email)

    const seeded = await seedLikedPropertyWithVibes({
      supabase,
      userId,
      seedKey: `${testInfo.project.name}-modal`,
    })

    try {
      await page.goto('/dashboard/liked', { waitUntil: 'domcontentloaded' })

      const card = page
        .locator('[data-testid="property-card"]')
        .filter({ hasText: seeded.address })
        .first()

      await expect(card).toBeVisible()

      await card.focus()
      await expect(card).toBeFocused()

      await page.keyboard.press('Enter')

      const dialog = page.locator('[role="dialog"]').first()
      await expect(dialog).toBeVisible()

      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(card).toBeFocused()
    } finally {
      await seeded.cleanup()
    }
  })

  test('snapshot: liked property card (desktop + mobile)', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Visual snapshots are only asserted in Chromium'
    )

    const supabase = createServiceRoleClient()
    const { testUser } = createWorkerAuthHelper(page, testInfo)
    const userId = await getAuthUserIdByEmail(supabase, testUser.email)

    const seeded = await seedLikedPropertyWithVibes({
      supabase,
      userId,
      seedKey: `${testInfo.project.name}-snapshot`,
    })

    try {
      await page.goto('/dashboard/liked', { waitUntil: 'domcontentloaded' })

      const card = page
        .locator('[data-testid="property-card"]')
        .filter({ hasText: seeded.address })
        .first()

      await expect(card).toBeVisible()

      const propertyIdPrefix = seeded.propertyId.slice(0, 8)
      const neighborhoodIdPrefix = seeded.neighborhoodId.slice(0, 8)
      const expectedPropertyTagline = `PLAYWRIGHT_UI_TAGLINE_${propertyIdPrefix}`
      const expectedNeighborhoodTagline = `PLAYWRIGHT_UI_NEIGHBORHOOD_${neighborhoodIdPrefix}`

      // Ensure async vibes content has rendered before taking visual snapshots
      await expect(card).toContainText(expectedPropertyTagline, {
        timeout: 15000,
      })
      await expect(card).toContainText(expectedNeighborhoodTagline, {
        timeout: 15000,
      })

      await page.evaluate(async () => {
        if (document.fonts?.ready) {
          await document.fonts.ready
        }
      })

      await expect(card).toHaveScreenshot('liked-card-desktop.png', {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.01,
      })

      await page.setViewportSize({ width: 390, height: 844 })
      await page.waitForTimeout(250)

      await expect(card).toHaveScreenshot('liked-card-mobile.png', {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.01,
      })
    } finally {
      await seeded.cleanup()
    }
  })
})
