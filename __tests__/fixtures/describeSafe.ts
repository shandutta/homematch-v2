import { test, expect } from './index'

// describeSafe wraps test.describe and guarantees at least one test exists.
// If the callback doesn't register any tests, we add a sanity test automatically.
export function describeSafe(name: string, cb: (t: typeof test) => void) {
  let testCount = 0

  // Create a counting facade for test that increments on each test() registration
  const countingTest = Object.assign(
    ((title: string, fn: Parameters<typeof test>[1], opts?: Parameters<typeof test>[2]) => {
      testCount++
      // @ts-expect-error - passthrough to Playwright test with same signature
      return test(title, fn, opts)
    }) as unknown as typeof test,
    {
      describe: test.describe,
      beforeEach: test.beforeEach,
      afterEach: test.afterEach,
      beforeAll: test.beforeAll,
      afterAll: test.afterAll,
      fixme: test.fixme,
      skip: test.skip,
      slow: test.slow,
      setTimeout: test.setTimeout,
      use: test.use,
      only: test.only,
    }
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
