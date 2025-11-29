/**
 * Global auth setup for Playwright tests
 * Creates authenticated states for each worker to enable auth caching
 */

import { test as setup } from '@playwright/test'
import { createWorkerAuthHelper } from '../utils/auth-helper'
import path from 'path'
import fs from 'fs'

// Auth storage file paths for each worker
const authDir = path.join(__dirname, '../../playwright/.auth')

setup('authenticate users for parallel workers', async ({ page }, testInfo) => {
  // Ensure auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  const workerIndex = testInfo.workerIndex
  const { auth, testUser } = createWorkerAuthHelper(page, testInfo)

  console.log(
    `Setting up auth for worker ${workerIndex} with user ${testUser.email}`
  )

  try {
    // Perform authentication
    await auth.login(testUser)

    // Verify authentication worked
    await auth.verifyAuthenticated()

    // Save auth state for this worker
    const authFile = path.join(authDir, `user-worker-${workerIndex}.json`)
    await page.context().storageState({ path: authFile })

    console.log(`✅ Auth state saved for worker ${workerIndex}`)
  } catch (error) {
    console.error(`❌ Auth setup failed for worker ${workerIndex}:`, error)
    throw error
  }
})
