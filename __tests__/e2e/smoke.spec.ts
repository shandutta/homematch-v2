import { test, expect } from '@playwright/test'

test('smoke test', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page).toHaveTitle(/HomeMatch/)
})
