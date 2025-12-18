/**
 * Global auth setup for Playwright tests
 * Creates authenticated states for each worker to enable auth caching
 */

import { test as setup } from '@playwright/test'
import { TEST_USERS } from '../fixtures/test-data'
import { createAuthHelper, createWorkerAuthHelper } from '../utils/auth-helper'
import path from 'path'
import fs from 'fs'

// Auth storage file paths for each worker
const authDir = path.join(__dirname, '../../playwright/.auth')
const FRESH_USER_STORAGE_INDEX = 99

setup(
  'authenticate users for parallel workers',
  async ({ browser }, testInfo) => {
    // Ensure auth directory exists
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
    }

    const totalWorkers = Math.max(1, testInfo.config.workers ?? 1)

    for (let workerIndex = 0; workerIndex < totalWorkers; workerIndex++) {
      const context = await browser.newContext()
      const page = await context.newPage()

      const { auth, testUser } = createWorkerAuthHelper(page, { workerIndex })

      console.log(
        `Setting up auth for worker ${workerIndex} with user ${testUser.email}`
      )

      try {
        await auth.login(testUser)
        await auth.verifyAuthenticated()

        const authFile = path.join(authDir, `user-worker-${workerIndex}.json`)
        await context.storageState({ path: authFile })

        console.log(`✅ Auth state saved for worker ${workerIndex}`)
      } catch (error) {
        console.error(`❌ Auth setup failed for worker ${workerIndex}:`, error)
        throw error
      } finally {
        await context.close()
      }
    }

    const context = await browser.newContext()
    const page = await context.newPage()
    const auth = createAuthHelper(page)

    console.log(
      `Setting up auth for fresh user ${TEST_USERS.freshUser.email} (storage index ${FRESH_USER_STORAGE_INDEX})`
    )

    try {
      await auth.login(TEST_USERS.freshUser)
      await auth.verifyAuthenticated()

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
