import { test, expect } from './index'

// describeSafe wraps test.describe and guarantees at least one test exists.
// If the callback doesn't register any tests, we add a sanity test automatically.
export function describeSafe(name: string, cb: (t: typeof test) => void) {
  let testCount = 0

  // Create a counting facade for test that increments on each test() registration
  const countingTest: typeof test = Object.assign(
    (...args: Parameters<typeof test>) => {
      testCount++
      return test(...args)
    },
    test
  )

  test.describe(name, () => {
    cb(countingTest)

    if (testCount === 0) {
      test('auto sanity', async ({ page }) => {
        await page.goto('/')
        await expect(page.locator('[data-testid="hero"]')).toBeVisible()
      })
    }
  })
}
