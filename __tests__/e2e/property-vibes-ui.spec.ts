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
  return crypto.createHash('md5').update(hashInput).digest('hex')
}

test.describe('Property Vibes - UI', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('liked list and modal render generated vibes', async ({
    page,
  }, testInfo) => {
    const supabase = createServiceRoleClient()
    const { testUser } = createWorkerAuthHelper(page, testInfo)

    const propertyId = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const address = `Playwright Vibes Test ${propertyId.slice(0, 8)}`
    const tagline = `PLAYWRIGHT_TAGLINE_${propertyId.slice(0, 8)}`
    const vibeStatement =
      'A bright, calm home that feels ready for both workdays and weekend hosting.'
    const tag = "Chef's Kitchen"
    const userId = await getAuthUserIdByEmail(supabase, testUser.email)

    const propertyRecord = {
      id: propertyId,
      address,
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94103',
      price: 1250000,
      bedrooms: 3,
      bathrooms: 2.5,
      square_feet: 1800,
      property_type: 'single_family',
      listing_status: 'active',
      images: ['/images/properties/house-1.svg'],
      description: 'Playwright seeded property for vibes UI verification.',
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt,
    }

    const sourceHash = generateSourceHash(propertyRecord)

    try {
      const { error: insertPropertyError } = await supabase
        .from('properties')
        .insert(propertyRecord)
      if (insertPropertyError) throw new Error(insertPropertyError.message)

      const { error: insertVibesError } = await supabase
        .from('property_vibes')
        .insert({
          property_id: propertyId,
          tagline,
          vibe_statement: vibeStatement,
          suggested_tags: [
            tag,
            'Remote Work Ready',
            'Open Concept Flow',
            'Urban Edge',
          ],
          feature_highlights: [],
          lifestyle_fits: [],
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
        })
      if (insertVibesError) throw new Error(insertVibesError.message)

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

      await page.goto('/dashboard/liked', { waitUntil: 'domcontentloaded' })

      const card = page
        .locator('[data-testid="property-card"]')
        .filter({ hasText: address })
        .first()

      await expect(card).toBeVisible()
      await expect(card).toContainText(tagline)

      await card.click({ force: true })

      const dialog = page.locator('[role="dialog"]').first()
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText('About this home')
      await expect(dialog).toContainText(tagline)
      await expect(dialog).toContainText(tag)
    } finally {
      await supabase
        .from('user_property_interactions')
        .delete()
        .match({ user_id: userId, property_id: propertyId })
      await supabase
        .from('property_vibes')
        .delete()
        .eq('property_id', propertyId)
      await supabase.from('properties').delete().eq('id', propertyId)
    }
  })
})
