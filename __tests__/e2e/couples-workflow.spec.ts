import { test, expect, Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Test data setup
const testUsers = {
  partner1: {
    email: 'couples-test-partner1@example.com',
    password: 'TestPass123!',
    name: 'Test Partner 1',
  },
  partner2: {
    email: 'couples-test-partner2@example.com',
    password: 'TestPass123!',
    name: 'Test Partner 2',
  },
}

const testProperties = [
  {
    id: 'test-prop-couples-1',
    address: '123 Romance Street',
    price: 500000,
    bedrooms: 3,
    bathrooms: 2,
  },
  {
    id: 'test-prop-couples-2',
    address: '456 Love Avenue',
    price: 750000,
    bedrooms: 4,
    bathrooms: 3,
  },
]

test.describe('Couples Features Workflow', () => {
  let supabaseAdmin: any
  let householdId: string

  test.beforeAll(async () => {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceKey) {
      throw new Error(
        'Missing SUPABASE_SERVICE_ROLE_KEY for E2E couples workflow. Set it in .env.test.local/.env.prod.'
      )
    }

    // Initialize Supabase admin client for test setup
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Create test household and users
    const { data: household } = await supabaseAdmin
      .from('households')
      .insert([{ name: 'Test Couples Household' }])
      .select()
      .single()

    householdId = household.id

    // Create test users
    for (const [_key, user] of Object.entries(testUsers)) {
      const { data: authUser, error: creationError } =
        await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        })

      let userId = authUser?.user?.id

      // Handle existing users created by prior runs
      if (!userId) {
        const { data: existingUsers, error: listError } =
          await supabaseAdmin.auth.admin.listUsers()

        if (listError) {
          throw new Error(
            `Failed to create or find user ${user.email}: ${listError.message}`
          )
        }

        const existingUser = existingUsers?.users?.find(
          (u: { email?: string; id: string }) =>
            u.email?.toLowerCase() === user.email.toLowerCase()
        )

        if (existingUser) {
          userId = existingUser.id
          const { error: updateError } =
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password: user.password,
              email_confirm: true,
            })

          if (updateError) {
            throw new Error(
              `Failed to update existing user ${user.email}: ${updateError.message}`
            )
          }
        } else if (creationError) {
          throw new Error(
            `Failed to create user ${user.email}: ${creationError.message}`
          )
        } else {
          throw new Error(
            `Failed to create or locate user ${user.email} for couples workflow tests`
          )
        }
      }

      // Create user profile and assign to household
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert(
          [
            {
              id: userId,
              email: user.email,
              display_name: user.name,
              household_id: householdId,
            },
          ],
          { onConflict: 'id' }
        )

      if (profileError) {
        throw new Error(
          `Failed to upsert profile for ${user.email}: ${profileError.message}`
        )
      }
    }

    // Create test properties
    const { error: propertiesError } = await supabaseAdmin
      .from('properties')
      .upsert(
        testProperties.map((prop) => ({
          id: prop.id,
          address: prop.address,
          price: prop.price,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          city: 'Test City',
          state: 'CA',
          zip_code: '12345',
          property_type: 'single_family',
          square_feet: 1500,
          is_active: true,
          listing_status: 'active',
          images: ['https://via.placeholder.com/400x300'],
        })),
        { onConflict: 'id' }
      )

    if (propertiesError) {
      throw new Error(
        `Failed to upsert test properties: ${propertiesError.message}`
      )
    }
  })

  test.afterAll(async () => {
    // Cleanup test data
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('user_property_interactions')
        .delete()
        .in(
          'property_id',
          testProperties.map((p) => p.id)
        )

      await supabaseAdmin
        .from('properties')
        .delete()
        .in(
          'id',
          testProperties.map((p) => p.id)
        )

      await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('household_id', householdId)

      await supabaseAdmin.from('households').delete().eq('id', householdId)
    }
  })

  async function loginUser(page: Page, userKey: keyof typeof testUsers) {
    const user = testUsers[userKey]
    await page.goto('/login')

    await page.fill('input[type="email"]', user.email)
    await page.fill('input[type="password"]', user.password)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
  }

  async function likeProperty(page: Page, propertyId: string) {
    // Navigate to property swiper
    await page.goto('/dashboard')

    // Wait for properties to load
    await page.waitForSelector('[data-testid="property-card"]')

    // Find and like the specific property
    const propertyCard = page
      .locator(`[data-property-id="${propertyId}"]`)
      .first()
    await expect(propertyCard).toBeVisible()

    // Click the like button
    const likeButton = propertyCard.locator('[data-testid="like-button"]')
    await likeButton.click()

    // Wait for the interaction to be recorded
    await page.waitForTimeout(1000)
  }

  test('Partner 1 likes a property', async ({ page }) => {
    await loginUser(page, 'partner1')

    await likeProperty(page, testProperties[0].id)

    // Verify the like was recorded (property should move to next)
    await expect(
      page.locator(`[data-property-id="${testProperties[0].id}"]`)
    ).not.toBeVisible()
  })

  test('Partner 2 likes same property creating mutual like', async ({
    page,
  }) => {
    await loginUser(page, 'partner2')

    await likeProperty(page, testProperties[0].id)

    // Check for mutual like notification or animation
    // This might be a toast, modal, or special animation
    await expect(
      page.locator('[data-testid="mutual-like-notification"]')
    ).toBeVisible({ timeout: 5000 })
  })

  test('Dashboard shows mutual likes section', async ({ page }) => {
    await loginUser(page, 'partner1')

    // Go to dashboard
    await page.goto('/dashboard')

    // Wait for mutual likes section to load
    await expect(
      page.locator('[data-testid="mutual-likes-section"]')
    ).toBeVisible()

    // Should show count in header
    await expect(page.locator('text=Both Liked (1)')).toBeVisible()

    // Should show the mutually liked property
    await expect(page.locator('text=123 Romance Street')).toBeVisible()

    // Should show mutual likes badge
    await expect(
      page.locator('[data-testid="mutual-likes-badge"]')
    ).toBeVisible()

    // Should show property details
    await expect(page.locator('text=$500k')).toBeVisible()
    await expect(page.locator('text=3 bed')).toBeVisible()
    await expect(page.locator('text=2 bath')).toBeVisible()
  })

  test('Property cards show mutual likes indicators', async ({ page }) => {
    await loginUser(page, 'partner2')

    // Go to property search/browse page
    await page.goto('/dashboard/liked')

    // Look for property cards with mutual like badges
    const mutualProperty = page.locator(
      `[data-property-id="${testProperties[0].id}"]`
    )
    await expect(mutualProperty).toBeVisible()

    // Should have mutual likes badge on the card
    const badge = mutualProperty.locator('[data-testid="mutual-likes-badge"]')
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('Both liked!')
  })

  test('Property swiper shows partner-liked indicator', async ({ page }) => {
    await loginUser(page, 'partner1')

    // Partner 2 likes another property first
    await page.goto('/dashboard')

    // We'll simulate partner 2 liking a property through API
    await page.evaluate(async (propertyId) => {
      // This would normally be done by partner 2's interaction
      await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          interaction_type: 'like',
        }),
      })
    }, testProperties[1].id)

    await page.reload()
    await page.waitForSelector('[data-testid="property-card"]')

    // The property should show partner-liked indicator (pink glow)
    const propertyCard = page.locator(
      `[data-property-id="${testProperties[1].id}"]`
    )
    await expect(propertyCard).toHaveClass(/partner-liked/)

    // Should show helper text
    await expect(page.locator('text=Your partner liked this!')).toBeVisible()
  })

  test('Mutual likes section handles empty state', async ({ page }) => {
    // Create new test users without any mutual likes
    const { data: tempUser } = await supabaseAdmin.auth.admin.createUser({
      email: 'temp-test@example.com',
      password: 'TempPass123!',
      email_confirm: true,
    })

    await supabaseAdmin.from('user_profiles').insert([
      {
        id: tempUser.user.id,
        email: 'temp-test@example.com',
        display_name: 'Temp User',
        household_id: null, // No household = no mutual likes
      },
    ])

    // Login with temp user
    await page.goto('/login')
    await page.fill('input[type="email"]', 'temp-test@example.com')
    await page.fill('input[type="password"]', 'TempPass123!')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/dashboard/)

    // Should show empty state
    await expect(page.locator('text=No mutual likes yet!')).toBeVisible()
    await expect(
      page.locator('text=Properties you both like will appear here')
    ).toBeVisible()

    // Cleanup
    await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', tempUser.user.id)
  })

  test('Mutual likes are clickable and navigate to property details', async ({
    page,
  }) => {
    await loginUser(page, 'partner1')

    await page.goto('/dashboard')

    // Wait for mutual likes section
    await expect(
      page.locator('[data-testid="mutual-likes-section"]')
    ).toBeVisible()

    // Click on the mutual like property
    await page.click(`[data-property-link="${testProperties[0].id}"]`)

    // Should navigate to property details page
    await expect(page).toHaveURL(
      new RegExp(`/properties/${testProperties[0].id}`)
    )

    // Should show property details
    await expect(page.locator('text=123 Romance Street')).toBeVisible()

    // Should show mutual likes indicator on details page
    await expect(
      page.locator('[data-testid="mutual-likes-badge"]')
    ).toBeVisible()
  })

  test('View all link appears when more than 3 mutual likes', async ({
    page,
  }) => {
    // Create additional mutual likes by having both partners like more properties
    const additionalProperties = [
      { id: 'test-prop-couples-3', address: '789 Harmony Blvd' },
      { id: 'test-prop-couples-4', address: '321 Unity Way' },
      { id: 'test-prop-couples-5', address: '654 Together Terrace' },
    ]

    // Add properties to database
    await supabaseAdmin.from('properties').insert(
      additionalProperties.map((prop) => ({
        id: prop.id,
        address: prop.address,
        price: 600000,
        bedrooms: 3,
        bathrooms: 2,
        city: 'Test City',
        state: 'CA',
        zip_code: '12345',
        property_type: 'single_family',
        square_feet: 1500,
        is_active: true,
        listing_status: 'active',
        images: ['https://via.placeholder.com/400x300'],
      }))
    )

    // Have both partners like all additional properties
    for (const prop of additionalProperties) {
      // Partner 1 likes
      await page.evaluate(async (propertyId) => {
        await fetch('/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_id: propertyId,
            interaction_type: 'like',
          }),
        })
      }, prop.id)
    }

    // Switch to partner 2
    await loginUser(page, 'partner2')

    for (const prop of additionalProperties) {
      await page.evaluate(async (propertyId) => {
        await fetch('/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_id: propertyId,
            interaction_type: 'like',
          }),
        })
      }, prop.id)
    }

    // Go to dashboard
    await page.goto('/dashboard')

    // Should now have 4 mutual likes, so "View all" link should appear
    await expect(page.locator('text=Both Liked (4)')).toBeVisible()
    await expect(page.locator('text=View all')).toBeVisible()

    // Should only show first 3 properties
    await expect(page.locator('text=123 Romance Street')).toBeVisible()
    await expect(page.locator('text=789 Harmony Blvd')).toBeVisible()
    await expect(page.locator('text=321 Unity Way')).toBeVisible()
    await expect(page.locator('text=654 Together Terrace')).not.toBeVisible()

    // Click "View all" link
    await page.click('text=View all')
    await expect(page).toHaveURL('/dashboard/mutual-likes')

    // Cleanup additional properties
    await supabaseAdmin
      .from('user_property_interactions')
      .delete()
      .in(
        'property_id',
        additionalProperties.map((p) => p.id)
      )

    await supabaseAdmin
      .from('properties')
      .delete()
      .in(
        'id',
        additionalProperties.map((p) => p.id)
      )
  })

  test('Mutual likes section shows loading and error states', async ({
    page,
  }) => {
    await loginUser(page, 'partner1')

    // Block API request to test loading state
    await page.route('**/api/couples/mutual-likes', (route) => {
      // Delay response to show loading state
      setTimeout(() => route.continue(), 2000)
    })

    await page.goto('/dashboard')

    // Should show loading skeletons
    await expect(page.locator('[data-testid="skeleton"]')).toBeVisible()

    // Wait for actual content to load
    await expect(page.locator('text=Both Liked')).toBeVisible()

    // Test error state by failing the API
    await page.route('**/api/couples/mutual-likes', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      })
    })

    await page.reload()

    // Should show error message
    await expect(
      page.locator('text=Failed to fetch mutual likes')
    ).toBeVisible()
  })

  test('Accessibility - mutual likes components are keyboard navigable', async ({
    page,
  }) => {
    await loginUser(page, 'partner1')

    await page.goto('/dashboard')

    // Wait for mutual likes section
    await expect(
      page.locator('[data-testid="mutual-likes-section"]')
    ).toBeVisible()

    // Tab through the mutual likes
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Find the focused mutual like item
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()

    // Press Enter to activate
    await page.keyboard.press('Enter')

    // Should navigate to property details
    await expect(page).toHaveURL(new RegExp('/properties/'))
  })

  test('Responsive design - mutual likes section works on mobile', async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await loginUser(page, 'partner1')
    await page.goto('/dashboard')

    // Should still show mutual likes section on mobile
    await expect(
      page.locator('[data-testid="mutual-likes-section"]')
    ).toBeVisible()

    // Content should be properly sized for mobile
    const section = page.locator('[data-testid="mutual-likes-section"]')
    const boundingBox = await section.boundingBox()
    expect(boundingBox?.width).toBeLessThanOrEqual(375)

    // Should be able to interact with mutual likes on mobile
    await page.tap('text=123 Romance Street')
    await expect(page).toHaveURL(new RegExp('/properties/'))
  })
})
