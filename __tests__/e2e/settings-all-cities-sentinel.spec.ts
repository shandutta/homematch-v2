import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { TEST_ROUTES } from '../fixtures/test-data'
import { createWorkerAuthHelper } from '../utils/auth-helper'
import { waitForHydration } from '../utils/hydration'
import { maybeClickWhenReady } from '../utils/uiActions'

const ALL_CITIES_SENTINEL_THRESHOLD = 200

type UserPreferences = Record<string, unknown> | null

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

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

async function fetchUserPreferences(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('preferences')
    .eq('id', userId)
    .single()
  if (error) throw new Error(error.message)
  return isRecord(data?.preferences) ? data.preferences : null
}

async function waitForUserPreferences(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  predicate: (preferences: UserPreferences) => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<UserPreferences> {
  const timeoutMs = options.timeoutMs ?? 15_000
  const intervalMs = options.intervalMs ?? 500
  const start = Date.now()

  let lastPreferences: UserPreferences = null

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

test.describe('Settings all-cities sentinel', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('collapses oversized city lists into the allCities sentinel', async ({
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
    const cities = Array.from(
      { length: ALL_CITIES_SENTINEL_THRESHOLD + 5 },
      (_, index) => ({
        city: `PW All Cities ${runId} ${index}`,
        state: 'CA',
      })
    )

    try {
      const { error: updatePrefsError } = await supabase
        .from('user_profiles')
        .update({
          preferences: {
            allCities: false,
            cities,
            neighborhoods: [],
          },
        })
        .eq('id', userId)
      if (updatePrefsError) throw new Error(updatePrefsError.message)

      await page.goto(TEST_ROUTES.app.settings, {
        waitUntil: 'domcontentloaded',
      })

      await waitForHydration(page)
      const listViewTab = page.getByRole('tab', { name: /list view/i })
      const listViewSelected = await maybeClickWhenReady(page, listViewTab)
      if (listViewSelected) {
        await expect(listViewTab).toHaveAttribute('data-state', 'active')
      }
      await expect(page.getByTestId('city-search')).toBeVisible()
      await expect(page.getByTestId('city-search')).toBeDisabled({
        timeout: 15000,
      })
      await expect(page.getByTestId('neighborhood-search')).toBeDisabled()
      await expect(
        page.getByText(
          'Neighborhood filtering is disabled when all cities are selected.'
        )
      ).toBeVisible()

      await waitForUserPreferences(supabase, userId, (preferences) => {
        return (
          preferences?.allCities === true &&
          Array.isArray(preferences?.cities) &&
          preferences.cities.length === 0 &&
          Array.isArray(preferences?.neighborhoods) &&
          preferences.neighborhoods.length === 0
        )
      })
    } finally {
      await supabase
        .from('user_profiles')
        .update({ preferences: existingProfile?.preferences ?? null })
        .eq('id', userId)
    }
  })

  test('collapses oversized neighborhood lists into the allCities sentinel', async ({
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
    const neighborhoods = Array.from(
      { length: ALL_CITIES_SENTINEL_THRESHOLD + 5 },
      (_, index) => `pw-neighborhood-${runId}-${index}`
    )

    try {
      const { error: updatePrefsError } = await supabase
        .from('user_profiles')
        .update({
          preferences: {
            allCities: false,
            cities: [{ city: `PW City ${runId}`, state: 'CA' }],
            neighborhoods,
          },
        })
        .eq('id', userId)
      if (updatePrefsError) throw new Error(updatePrefsError.message)

      await page.goto(TEST_ROUTES.app.settings, {
        waitUntil: 'domcontentloaded',
      })

      await waitForHydration(page)
      const listViewTab = page.getByRole('tab', { name: /list view/i })
      const listViewSelected = await maybeClickWhenReady(page, listViewTab)
      if (listViewSelected) {
        await expect(listViewTab).toHaveAttribute('data-state', 'active')
      }
      await expect(page.getByTestId('city-search')).toBeVisible()
      await expect(page.getByTestId('city-search')).toBeDisabled({
        timeout: 15000,
      })
      await expect(page.getByTestId('neighborhood-search')).toBeDisabled()
      await expect(
        page.getByText(
          'Neighborhood filtering is disabled when all cities are selected.'
        )
      ).toBeVisible()

      await waitForUserPreferences(supabase, userId, (preferences) => {
        return (
          preferences?.allCities === true &&
          Array.isArray(preferences?.cities) &&
          preferences.cities.length === 0 &&
          Array.isArray(preferences?.neighborhoods) &&
          preferences.neighborhoods.length === 0
        )
      })
    } finally {
      await supabase
        .from('user_profiles')
        .update({ preferences: existingProfile?.preferences ?? null })
        .eq('id', userId)
    }
  })
})
