import type { Page } from '@playwright/test'

export async function waitForHydration(page: Page, timeout = 15000) {
  await page.waitForFunction(
    () => document.documentElement.dataset.hydrated === 'true',
    { timeout }
  )
}
