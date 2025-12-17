/**
 * Couples full UI journey E2E
 *
 * Covers the consumer flow end-to-end with minimal mocking:
 * - User creates a household from /couples
 * - User invites partner (creates real household_invitations row)
 * - Partner signs in from invite link and accepts
 * - Both users like the same property via the real UI
 * - Dashboard + Couples surfaces the mutual like
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { createAuthHelper, createWorkerAuthHelper } from '../utils/auth-helper'
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

async function waitFor<T>(
  fn: () => Promise<T | null>,
  options: { timeoutMs: number; label: string; intervalMs?: number }
): Promise<T> {
  const startedAt = Date.now()
  const intervalMs = options.intervalMs ?? 250

  while (Date.now() - startedAt < options.timeoutMs) {
    const value = await fn()
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Timed out waiting for ${options.label}`)
}

async function seedNeighborhoodAndProperty(
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<{ neighborhoodId: string; propertyId: string; address: string }> {
  const propertyId = crypto.randomUUID()
  const neighborhoodId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const address = `Playwright Couples Match ${propertyId.slice(0, 8)}`

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
    description: 'E2E seeded property for couples match flow',
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

async function likePropertyFromDashboard(page: Page, address: string) {
  const card = page
    .getByTestId('property-card')
    .filter({
      has: page.getByTestId('property-address').filter({ hasText: address }),
    })
    .first()

  await expect(card).toBeVisible({ timeout: 20000 })
  await card.locator('button[aria-label="Like this home"]').click()
}

async function getHouseholdIdFromWaitingState(page: Page): Promise<string> {
  const container = page.locator('text=Share this household ID:').first()
  await expect(container).toBeVisible()

  const code = container.locator('..').locator('code').first()
  const householdId = (await code.textContent())?.trim() || ''

  expect(householdId).toMatch(/^[0-9a-f-]{36}$/i)
  return householdId
}

test.describe('Couples full journey (real UI)', () => {
  test('create household → invite → accept → mutual like', async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(120000)

    const service = createServiceRoleClient()

    const inviterUser = getWorkerTestUser(testInfo.workerIndex)
    const partnerUser = getWorkerTestUser((testInfo.workerIndex + 4) % 8)

    const [inviterId, partnerId] = await Promise.all([
      getAuthUserIdByEmail(service, inviterUser.email),
      getAuthUserIdByEmail(service, partnerUser.email),
    ])

    const { data: startingProfiles, error: startingProfilesError } =
      await service
        .from('user_profiles')
        .select('id, household_id, preferences')
        .in('id', [inviterId, partnerId])

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

    let householdId: string | null = null
    let inviteToken: string | null = null
    let propertyId: string | null = null
    let neighborhoodId: string | null = null
    let propertyAddress: string | null = null

    let partnerContext: BrowserContext | null = null
    let partnerPage: Page | null = null

    try {
      // Force deterministic "no household" + "no location filters" for the journey.
      await service
        .from('user_profiles')
        .update({ household_id: null, preferences: null })
        .in('id', [inviterId, partnerId])

      const seeded = await seedNeighborhoodAndProperty(service)
      propertyId = seeded.propertyId
      neighborhoodId = seeded.neighborhoodId
      propertyAddress = seeded.address

      const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
      await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
      await auth.verifyAuthenticated()

      // Couples entry point (no household yet)
      await page.goto('/couples', { waitUntil: 'domcontentloaded' })
      await expect(
        page.getByRole('link', { name: /create household/i }).first()
      ).toBeVisible()
      await page
        .getByRole('link', { name: /create household/i })
        .first()
        .click()

      // Create household
      await expect(page).toHaveURL(/\/household\/create/)
      const householdName = `Playwright Household ${crypto.randomUUID().slice(0, 8)}`
      await page.getByLabel('Household Name').fill(householdName)
      await page.getByRole('button', { name: /create household/i }).click()

      // Waiting state shows the household ID
      await expect(page).toHaveURL(/\/couples/)
      await expect(
        page.getByRole('button', { name: /send invitation/i })
      ).toBeVisible()
      householdId = await getHouseholdIdFromWaitingState(page)

      // Invite partner via modal
      await page.getByRole('button', { name: /send invitation/i }).click()
      const inviteDialog = page.getByRole('dialog')
      await expect(inviteDialog).toBeVisible()

      await inviteDialog.locator('input[type="email"]').fill(partnerUser.email)
      await inviteDialog
        .getByRole('button', { name: /send invitation/i })
        .click()

      await expect(inviteDialog.getByText(/pending invitations/i)).toBeVisible({
        timeout: 20000,
      })
      await expect(
        inviteDialog.getByText(new RegExp(partnerUser.email, 'i'))
      ).toBeVisible()

      inviteToken = await waitFor(
        async () => {
          const { data } = await service
            .from('household_invitations')
            .select('token')
            .eq('household_id', householdId)
            .eq('invited_email', partnerUser.email.toLowerCase())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          return data?.token ?? null
        },
        { timeoutMs: 15000, label: 'invite token' }
      )

      // Close the modal before continuing the inviter flow
      await page.keyboard.press('Escape').catch(() => {})

      // Partner: open invite link logged out, sign in, then accept
      partnerContext = await browser.newContext()
      partnerPage = await partnerContext.newPage()
      const partnerAuth = createAuthHelper(partnerPage)

      await partnerPage.goto(`/invite/${inviteToken}`, {
        waitUntil: 'domcontentloaded',
      })

      const signInLink = partnerPage.getByRole('link', {
        name: /sign in to accept/i,
      })
      await expect(signInLink).toBeVisible()
      await signInLink.click()

      await expect(partnerPage).toHaveURL(/\/login/)

      const { submitButton } = await partnerAuth.fillCredentials(
        partnerUser.email,
        partnerUser.password
      )
      await submitButton.click()

      await expect(partnerPage).toHaveURL(new RegExp(`/invite/${inviteToken}`))
      await partnerPage
        .getByRole('button', { name: /accept invitation/i })
        .click()

      // Confirm household link is in place for partner (RLS-safe via service role)
      await waitFor(
        async () => {
          const { data } = await service
            .from('user_profiles')
            .select('household_id')
            .eq('id', partnerId)
            .maybeSingle()

          return data?.household_id === householdId ? true : null
        },
        { timeoutMs: 15000, label: 'partner household join' }
      )

      // The invite page pushes to /dashboard client-side; if that navigation flakes,
      // keep the journey moving once the DB confirms membership.
      await partnerPage.waitForURL(/\/dashboard/, { timeout: 5000 }).catch(() => {})
      if (!partnerPage.url().includes('/dashboard')) {
        await partnerPage.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      }

      // Inviter should now see an active couples page after refresh
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/your love story/i)).toBeVisible()

      // Like the seeded property as inviter
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await likePropertyFromDashboard(page, propertyAddress)
      await waitFor(
        async () => {
          const { data } = await service
            .from('user_property_interactions')
            .select('household_id')
            .eq('user_id', inviterId)
            .eq('property_id', propertyId!)
            .eq('interaction_type', 'like')
            .maybeSingle()

          return data?.household_id === householdId ? true : null
        },
        { timeoutMs: 15000, label: 'inviter interaction recorded' }
      )

      // Like the same seeded property as partner (triggers mutual-like flow)
      await partnerPage.goto('/dashboard', { waitUntil: 'domcontentloaded' })
      await likePropertyFromDashboard(partnerPage, propertyAddress)
      await waitFor(
        async () => {
          const { data } = await service
            .from('user_property_interactions')
            .select('household_id')
            .eq('user_id', partnerId)
            .eq('property_id', propertyId!)
            .eq('interaction_type', 'like')
            .maybeSingle()

          return data?.household_id === householdId ? true : null
        },
        { timeoutMs: 15000, label: 'partner interaction recorded' }
      )

      await waitFor(
        async () => {
          const { data } = await service
            .from('user_property_interactions')
            .select('user_id')
            .eq('household_id', householdId)
            .eq('property_id', propertyId!)
            .eq('interaction_type', 'like')

          const uniqueLikers = new Set((data ?? []).map((row) => row.user_id))
          return uniqueLikers.size >= 2 ? true : null
        },
        { timeoutMs: 15000, label: 'mutual like recorded' }
      )

      // Dashboard mutual likes should now list the matched property
      await partnerPage.reload({ waitUntil: 'domcontentloaded' })
      const mutualLikesList = partnerPage.getByTestId('mutual-likes-list')
      await expect(mutualLikesList).toBeVisible({ timeout: 30000 })
      await expect(mutualLikesList.getByText(propertyAddress)).toBeVisible()

      // Couples page should surface the same mutual like
      await partnerPage.goto('/couples', { waitUntil: 'domcontentloaded' })
      await expect(partnerPage.getByText(/your love story/i)).toBeVisible()
      await expect(partnerPage.getByText(propertyAddress).first()).toBeVisible({
        timeout: 20000,
      })
    } finally {
      if (partnerContext) {
        await partnerContext.close().catch(() => {})
      }

      if (householdId) {
        await safeCleanup('delete interactions', async () => {
          await service
            .from('user_property_interactions')
            .delete()
            .eq('household_id', householdId)
        })

        await safeCleanup('delete invites', async () => {
          await service
            .from('household_invitations')
            .delete()
            .eq('household_id', householdId)
        })
      }

      if (propertyId) {
        await safeCleanup('delete property', async () => {
          await service.from('properties').delete().eq('id', propertyId!)
        })
      }

      if (neighborhoodId) {
        await safeCleanup('delete neighborhood', async () => {
          await service.from('neighborhoods').delete().eq('id', neighborhoodId!)
        })
      }

      await safeCleanup('restore inviter profile', async () => {
        const profile = startingProfileById.get(inviterId)
        await service
          .from('user_profiles')
          .update({
            household_id: profile?.household_id ?? null,
            preferences: profile?.preferences ?? null,
          })
          .eq('id', inviterId)
      })

      await safeCleanup('restore partner profile', async () => {
        const profile = startingProfileById.get(partnerId)
        await service
          .from('user_profiles')
          .update({
            household_id: profile?.household_id ?? null,
            preferences: profile?.preferences ?? null,
          })
          .eq('id', partnerId)
      })

      if (householdId) {
        await safeCleanup('delete household', async () => {
          await service.from('households').delete().eq('id', householdId!)
        })
      }

      if (cleanupFailures.length) {
        console.warn(
          '[Couples Journey] Cleanup warnings:\n' + cleanupFailures.join('\n')
        )
      }
    }
  })
})
