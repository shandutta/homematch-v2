import type { Locator, Page } from '@playwright/test'

type ClickOptions = {
  timeout?: number
  retryDelayMs?: number
}

export async function clickWhenReady(
  page: Page,
  locator: Locator,
  options: ClickOptions = {}
) {
  const timeout = options.timeout ?? 15000
  const retryDelayMs = options.retryDelayMs ?? 200
  const deadline = Date.now() + timeout
  let lastError: unknown

  while (Date.now() < deadline) {
    const remaining = Math.min(2000, Math.max(250, deadline - Date.now()))
    try {
      await locator.waitFor({ state: 'visible', timeout: remaining })
      await locator.scrollIntoViewIfNeeded().catch(() => {})
      await locator.click({ force: true, timeout: remaining })
      return
    } catch (error) {
      lastError = error
      await page.waitForTimeout(retryDelayMs)
    }
  }

  throw lastError ?? new Error('Timed out while clicking locator')
}

export async function maybeClickWhenReady(
  page: Page,
  locator: Locator,
  options: ClickOptions = {}
) {
  const count = await locator.count()
  if (count === 0) return false
  await clickWhenReady(page, locator, options)
  return true
}
