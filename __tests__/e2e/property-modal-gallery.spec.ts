import { test, expect } from '@playwright/test'
import { TEST_ROUTES } from '../fixtures/test-data'
import { createWorkerAuthHelper } from '../utils/auth-helper'

test.describe('Property modal gallery navigation', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const { auth, testUser } = createWorkerAuthHelper(page, testInfo)
    await auth.authenticateWithStorageState(testInfo.workerIndex, testUser)
    await auth.verifyAuthenticated()
  })

  test('lets users browse multiple images inside the modal', async ({
    page,
  }) => {
    await page.goto(TEST_ROUTES.app.dashboard, {
      waitUntil: 'domcontentloaded',
    })

    const propertyCard = page.locator('[data-testid="property-card"]').first()
    await expect(propertyCard).toBeVisible({ timeout: 15000 })
    await propertyCard.click()

    const counter = page.locator('[data-testid="image-counter"]')
    await expect(counter).toBeVisible({ timeout: 15000 })

    const nextButton = page.locator('[data-testid="next-image"]')
    const previousButton = page.locator('[data-testid="previous-image"]')

    await expect(nextButton).toBeVisible()
    await expect(previousButton).toBeVisible()

    const initialCounter = await counter.textContent()

    await nextButton.click()
    await expect(counter).not.toHaveText(initialCounter ?? '')

    await previousButton.click()
    if (initialCounter) {
      await expect(counter).toHaveText(initialCounter)
    }
  })
})
