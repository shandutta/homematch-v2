import { test, expect, type Page, type Route } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { TEST_ROUTES } from '../fixtures/test-data'
import { createWorkerAuthHelper } from '../utils/auth-helper'

const MAP_VIEW_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_LOCATION_MAP_VIEW === 'true'
test.skip(!MAP_VIEW_ENABLED, 'Location map view is disabled')

type UserPreferences = Record<string, unknown> | null

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const MAPS_STUB_SCRIPT = `
  (function() {
    window.google = window.google || {}
    window.google.maps = window.google.maps || {}
    window.google.maps.marker = window.google.maps.marker || {}
    window.google.maps.marker.AdvancedMarkerElement = function() {
      this.addListener = function() {}
    }
    window.google.maps.Map = function(el) {
      if (el && !el.querySelector('.gm-style')) {
        var node = document.createElement('div')
        node.className = 'gm-style'
        node.style.width = '100%'
        node.style.height = '100%'
        node.style.display = 'block'
        el.appendChild(node)
      }
      this.setCenter = function() {}
      this.setZoom = function() {}
      this.fitBounds = function() {}
    }
    window.google.maps.Polygon = function(options) {
      this.options = options || {}
      this.setOptions = function(next) {
        this.options = Object.assign({}, this.options, next || {})
      }
      this.setMap = function() {}
      this.addListener = function() {}
    }
    window.google.maps.LatLngBounds = function() {
      this.extend = function() {}
    }
    window.google.maps.Marker = function() {
      this.addListener = function() {}
    }
    window.google.maps.Size = function() {}
    window.google.maps.Point = function() {}
    window.google.maps.InfoWindow = function() {
      this.open = function() {}
    }
    window.google.maps.drawing = {
      OverlayType: {
        CIRCLE: 'circle',
        MARKER: 'marker',
        POLYGON: 'polygon',
        POLYLINE: 'polyline',
        RECTANGLE: 'rectangle'
      },
      DrawingManager: function() {
        this.setMap = function() {}
        this.setDrawingMode = function() {}
        this.setOptions = function() {}
        this.addListener = function() {}
      }
    }
    if (window.initGoogleMaps) window.initGoogleMaps()
  })()
`

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

function cityKey(city: string, state: string) {
  return `${city.toLowerCase()}|${state.toLowerCase()}`
}

async function stubGoogleMaps(page: Page) {
  await page.route('**/api/maps/proxy-script*', (route: Route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: MAPS_STUB_SCRIPT,
    })
  })
}

test.describe('Settings location map selection', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('supports city overlays and draw selection', async ({
    page,
  }, testInfo) => {
    const supabase = createServiceRoleClient()
    const { testUser } = createWorkerAuthHelper(page, testInfo)
    const userId = await getAuthUserIdByEmail(supabase, testUser.email)

    const runId = crypto.randomUUID().slice(0, 8)
    const metroArea = `PW Metro ${runId}`
    const createdAt = new Date().toISOString()

    const cityA = `PW Map City ${runId} A`
    const cityB = `PW Map City ${runId} B`
    const state = 'CA'

    const neighborhoodA1 = {
      id: crypto.randomUUID(),
      name: `PW Map Neighborhood ${runId} A1`,
      city: cityA,
      state,
      metro_area: metroArea,
      bounds:
        'SRID=4326;POLYGON((-122.42 37.78, -122.41 37.78, -122.41 37.77, -122.42 37.77, -122.42 37.78))',
      created_at: createdAt,
    }

    const neighborhoodA2 = {
      id: crypto.randomUUID(),
      name: `PW Map Neighborhood ${runId} A2`,
      city: cityA,
      state,
      metro_area: metroArea,
      bounds:
        'SRID=4326;POLYGON((-122.43 37.78, -122.42 37.78, -122.42 37.77, -122.43 37.77, -122.43 37.78))',
      created_at: createdAt,
    }

    const neighborhoodB1 = {
      id: crypto.randomUUID(),
      name: `PW Map Neighborhood ${runId} B1`,
      city: cityB,
      state,
      metro_area: metroArea,
      bounds:
        'SRID=4326;POLYGON((-122.46 37.74, -122.45 37.74, -122.45 37.73, -122.46 37.73, -122.46 37.74))',
      created_at: createdAt,
    }

    let originalPreferences: UserPreferences = null

    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('id', userId)
        .single()
      if (profileError) throw new Error(profileError.message)
      originalPreferences = isRecord(profile?.preferences)
        ? profile.preferences
        : null

      const { error: resetError } = await supabase
        .from('user_profiles')
        .update({ preferences: null })
        .eq('id', userId)
      if (resetError) throw new Error(resetError.message)

      const { error: insertError } = await supabase
        .from('neighborhoods')
        .insert([neighborhoodA1, neighborhoodA2, neighborhoodB1])
      if (insertError) throw new Error(insertError.message)

      await stubGoogleMaps(page)
      await page.goto(TEST_ROUTES.app.settings)

      await expect(page.getByTestId('location-map')).toBeVisible()
      await expect(page.getByTestId('map-metro-select')).toBeEnabled()

      await page.getByTestId('map-metro-select').click()
      await page.getByRole('option', { name: metroArea }).click()

      await expect(
        page.getByText(`Metro: "${metroArea}" (3 neighborhoods)`)
      ).toBeVisible()

      await page.getByTestId('map-overlay-cities').click()

      await page.waitForFunction(
        () => window.__homematchMapTestHooks?.selectCity
      )

      const cityAKey = cityKey(cityA, state)
      await page.evaluate((key) => {
        window.__homematchMapTestHooks?.selectCity(key)
      }, cityAKey)

      await expect(page.getByTestId('location-summary')).toContainText('1 city')
      await expect(page.getByTestId('location-summary')).toContainText(
        '2 neighborhoods'
      )

      await page.getByTestId('map-overlay-neighborhoods').click()

      const drawRing = [
        { lat: 37.745, lng: -122.47 },
        { lat: 37.745, lng: -122.44 },
        { lat: 37.725, lng: -122.44 },
        { lat: 37.725, lng: -122.47 },
      ]

      await page.evaluate((ring) => {
        window.__homematchMapTestHooks?.drawSelection(ring)
      }, drawRing)

      await expect(page.getByTestId('location-summary')).toContainText(
        '2 cities'
      )
      await expect(page.getByTestId('location-summary')).toContainText(
        '3 neighborhoods'
      )
    } finally {
      await supabase
        .from('neighborhoods')
        .delete()
        .in('id', [neighborhoodA1.id, neighborhoodA2.id, neighborhoodB1.id])

      if (originalPreferences !== null) {
        await supabase
          .from('user_profiles')
          .update({ preferences: originalPreferences })
          .eq('id', userId)
      }
    }
  })
})
