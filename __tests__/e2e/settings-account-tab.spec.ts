import { test, expect } from '@playwright/test'
import { TEST_ROUTES } from '../fixtures/test-data'
import { createWorkerAuthHelper } from '../utils/auth-helper'

test.describe('Settings account tab', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('renders account content without the error boundary', async ({
    page,
  }) => {
    await page.goto(TEST_ROUTES.app.settings, {
      waitUntil: 'domcontentloaded',
    })

    await page.getByRole('tab', { name: /account/i }).click()

    await expect(
      page.getByRole('heading', { name: 'Account Information' })
    ).toBeVisible({ timeout: 15000 })
    await expect(
      page.getByRole('heading', { name: 'Something went wrong!' })
    ).toHaveCount(0)
  })
})
