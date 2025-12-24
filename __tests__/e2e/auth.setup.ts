/**
 * Global auth setup for Playwright tests
 * Creates authenticated states for each worker to enable auth caching
 */

import { test as setup } from '@playwright/test'
import type { BrowserContext, Page, TestInfo } from '@playwright/test'
import { TEST_USERS, WORKER_TEST_USER_COUNT } from '../fixtures/test-data'
import { createAuthHelper, createWorkerAuthHelper } from '../utils/auth-helper'
import { getSupabaseAuthStorageKey } from '../../src/lib/supabase/storage-keys'
import path from 'path'
import fs from 'fs'

// Auth storage file paths for each worker
const authDir = path.join(__dirname, '../../playwright/.auth')
const FRESH_USER_STORAGE_INDEX = 99

const resolveBaseUrl = (testInfo: TestInfo) => {
  const fromConfig = testInfo?.project?.use?.baseURL
  if (typeof fromConfig === 'string' && fromConfig) return fromConfig
  return (
    process.env.BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    'http://127.0.0.1:3000'
  )
}

const resolveHostname = (baseUrl: string) => {
  try {
    return new URL(baseUrl).hostname || 'localhost'
  } catch {
    return 'localhost'
  }
}

const waitForAuthPersisted = async ({
  storageKey,
  context,
  page,
}: {
  storageKey: string
  context: BrowserContext
  page: Page
}) => {
  const timeoutMs = 15_000
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    if (page.isClosed()) {
      throw new Error('Auth page closed before session persisted')
    }

    const [cookies, storageValue] = await Promise.all([
      context.cookies().catch(() => []),
      page
        .evaluate((key: string) => {
          try {
            return localStorage.getItem(key)
          } catch {
            return null
          }
        }, storageKey)
        .catch(() => null),
    ])

    const hasCookie = cookies.some(
      (cookie) => cookie.name === storageKey && Boolean(cookie.value)
    )

    if (hasCookie || storageValue) return

    await page.waitForTimeout(250)
  }

  throw new Error(`Auth session not persisted (storageKey=${storageKey})`)
}

setup(
  'authenticate users for parallel workers',
  async ({ browser }, testInfo) => {
    // Ensure auth directory exists
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
    }

    const baseUrl = resolveBaseUrl(testInfo)
    const hostname = resolveHostname(baseUrl)
    const storageKey = getSupabaseAuthStorageKey(hostname)

    // Seed all worker test users so modulo worker indices can always reuse storage.
    const workersToSeed = WORKER_TEST_USER_COUNT

    for (let workerIndex = 0; workerIndex < workersToSeed; workerIndex++) {
      const authFile = path.join(authDir, `user-worker-${workerIndex}.json`)
      let lastError: unknown

      for (let attempt = 1; attempt <= 2; attempt++) {
        const context = await browser.newContext({ baseURL: baseUrl })
        const page = await context.newPage()

        const { auth, testUser } = createWorkerAuthHelper(page, { workerIndex })

        console.log(
          `Setting up auth for worker ${workerIndex} with user ${testUser.email} (attempt ${attempt}/2)`
        )

        try {
          await auth.login(testUser)

          await waitForAuthPersisted({ storageKey, context, page })

          await context.storageState({ path: authFile })

          console.log(`✅ Auth state saved for worker ${workerIndex}`)
          await context.close().catch(() => {})
          lastError = null
          break
        } catch (error) {
          lastError = error
          console.error(
            `❌ Auth setup failed for worker ${workerIndex}:`,
            error
          )
          await context.close().catch(() => {})

          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 750))
          }
        }
      }

      if (lastError) {
        throw lastError
      }
    }

    const context = await browser.newContext({ baseURL: baseUrl })
    const page = await context.newPage()
    const auth = createAuthHelper(page)

    console.log(
      `Setting up auth for fresh user ${TEST_USERS.freshUser.email} (storage index ${FRESH_USER_STORAGE_INDEX})`
    )

    try {
      await auth.login(TEST_USERS.freshUser)
      await waitForAuthPersisted({ storageKey, context, page })

      const authFile = path.join(
        authDir,
        `user-worker-${FRESH_USER_STORAGE_INDEX}.json`
      )
      await context.storageState({ path: authFile })

      console.log(`✅ Auth state saved for fresh user`)
    } catch (error) {
      console.error(`❌ Auth setup failed for fresh user:`, error)
      throw error
    } finally {
      await context.close()
    }
  }
)
