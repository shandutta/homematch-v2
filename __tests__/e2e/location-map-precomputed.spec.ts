import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { createWorkerAuthHelper } from '../utils/auth-helper'

const MAPS_STUB_SCRIPT = `
  (function() {
    window.google = window.google || {}
    window.google.maps = window.google.maps || {}
    window.google.maps.Map = function(el) {
      if (el && !el.querySelector('.gm-style')) {
        var node = document.createElement('div')
        node.className = 'gm-style'
        node.style.width = '100%'
        node.style.height = '100%'
        node.style.display = 'block'
        el.appendChild(node)
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

function resolveBaseUrl(testInfo: TestInfo) {
  return (
    testInfo.project.use.baseURL ||
    process.env.BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    'http://127.0.0.1:3000'
  ).replace(/\/$/, '')
}

async function stubGoogleMaps(page: Page) {
  await page.route('**/api/maps/proxy-script*', (route: any) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: MAPS_STUB_SCRIPT,
    })
  })
}

test.describe('Location map precomputed boundaries', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('uses precomputed MECE boundaries when metro changes', async ({
    page,
  }, testInfo) => {
    await stubGoogleMaps(page)

    const supabase = createServiceRoleClient()
    const metro = `Playwright Metro ${crypto.randomUUID()}`
    const seedRows = [
      {
        id: crypto.randomUUID(),
        name: 'E2E Alpha',
        city: 'Testopolis',
        state: 'TS',
        metro_area: metro,
        bounds: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      },
      {
        id: crypto.randomUUID(),
        name: 'E2E Beta',
        city: 'Testopolis',
        state: 'TS',
        metro_area: metro,
        bounds: {
          type: 'Polygon',
          coordinates: [
            [
              [0.5, 0.5],
              [1.5, 0.5],
              [1.5, 1.5],
              [0.5, 1.5],
              [0.5, 0.5],
            ],
          ],
        },
      },
    ]

    await supabase.from('neighborhoods').insert(seedRows)

    const baseURL = resolveBaseUrl(testInfo)
    await page.goto(`${baseURL}/settings?tab=preferences`, {
      waitUntil: 'domcontentloaded',
    })

    const metroSelect = page.getByTestId('map-metro-select')
    await metroSelect.click()
    const option = page.getByRole('option', { name: metro })
    await option.waitFor({ timeout: 10000 })

    const responsePromise = page.waitForResponse((response) =>
      response
        .url()
        .includes(
          `/api/maps/metro-boundaries?metro=${encodeURIComponent(metro)}`
        )
    )

    await option.click()
    const response = await responsePromise
    expect(response.ok()).toBe(true)

    const payload = await response.json()
    expect(payload.precomputed).toBe(true)
    expect(payload.neighborhoods.length).toBe(2)

    const map = page.getByTestId('location-map')
    await expect(map).toBeVisible({ timeout: 15000 })
    await expect(map.locator('.gm-style')).toBeVisible({ timeout: 15000 })

    await supabase.from('neighborhoods').delete().eq('metro_area', metro)
  })
})
