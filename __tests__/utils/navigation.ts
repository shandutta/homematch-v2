import type { Page } from '@playwright/test'

export async function ensureOnDashboard(
  page: Page,
  options: { initialWaitMs?: number; finalWaitMs?: number } = {}
): Promise<void> {
  if (page.url().includes('/dashboard')) return

  try {
    await page.waitForURL(/\/dashboard/, {
      timeout: options.initialWaitMs ?? 5000,
    })
    return
  } catch {
    await page.waitForLoadState('domcontentloaded').catch(() => {})
  }

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForURL(/\/dashboard/, {
    timeout: options.finalWaitMs ?? 15000,
  })
}
