import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { createAuthHelper } from '../utils/auth-helper'
import { TEST_USERS } from '../fixtures/test-data'

type PerfMetrics = {
  ttfb: number
  domContentLoaded: number
  load: number
  fcp: number
  lcp: number
  cls: number
  resourceCount: number
  totalTransferKb: number
}

type PerfBudget = Partial<PerfMetrics>

const PERF_BUDGETS: Record<string, PerfBudget> = {
  landing: {
    ttfb: 1500,
    domContentLoaded: 4000,
    load: 8000,
    fcp: 3000,
    lcp: 4500,
    cls: 0.25,
    resourceCount: 140,
    totalTransferKb: 1800,
  },
  login: {
    ttfb: 1500,
    domContentLoaded: 3500,
    load: 7000,
    fcp: 2500,
    lcp: 3500,
    cls: 0.25,
    resourceCount: 120,
    totalTransferKb: 1400,
  },
  dashboard: {
    ttfb: 1800,
    domContentLoaded: 5000,
    load: 10000,
    fcp: 3500,
    lcp: 5500,
    cls: 0.25,
    resourceCount: 180,
    totalTransferKb: 2500,
  },
}

const shouldEnforceBudgets =
  process.env.PERF_BUDGETS === 'true' || process.env.CI_PERF_BUDGETS === 'true'

const perfResultsDir = path.join(__dirname, '../../test-results/performance')

const setupPerfObservers = async (page: Page) => {
  await page.addInitScript(() => {
    const win = window as typeof window & {
      __hmPerf?: { lcp: number; cls: number }
    }

    win.__hmPerf = { lcp: 0, cls: 0 }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const candidate =
            entry.startTime ||
            (entry as any).renderTime ||
            (entry as any).loadTime ||
            0
          if (candidate > win.__hmPerf!.lcp) {
            win.__hmPerf!.lcp = candidate
          }
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      // Ignore if the browser doesn't support this entry type.
    }

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value?: number
            hadRecentInput?: boolean
          }
          if (!shift.hadRecentInput) {
            win.__hmPerf!.cls += shift.value ?? 0
          }
        }
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {
      // Ignore if the browser doesn't support this entry type.
    }
  })
}

const collectPerfMetrics = async (page: Page): Promise<PerfMetrics> => {
  return page.evaluate(() => {
    const navEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    const navStart = navEntry?.startTime ?? 0
    const ttfb = navEntry ? navEntry.responseStart - navStart : 0
    const domContentLoaded = navEntry
      ? navEntry.domContentLoadedEventEnd - navStart
      : 0
    const load = navEntry ? navEntry.loadEventEnd - navStart : 0

    const paintEntries = performance.getEntriesByType('paint')
    const fcpEntry = paintEntries.find(
      (entry) => entry.name === 'first-contentful-paint'
    )
    const fcp = fcpEntry ? fcpEntry.startTime : 0

    const resourceEntries = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[]
    const totalTransferBytes = resourceEntries.reduce((total, entry) => {
      const transferSize = entry.transferSize || entry.encodedBodySize || 0
      return total + transferSize
    }, 0)

    const win = window as typeof window & {
      __hmPerf?: { lcp: number; cls: number }
    }

    return {
      ttfb,
      domContentLoaded,
      load,
      fcp,
      lcp: win.__hmPerf?.lcp ?? 0,
      cls: win.__hmPerf?.cls ?? 0,
      resourceCount: resourceEntries.length,
      totalTransferKb: Math.round(totalTransferBytes / 1024),
    }
  })
}

const persistMetrics = (
  label: string,
  metrics: PerfMetrics,
  testInfo: ReturnType<typeof test.info>
) => {
  fs.mkdirSync(perfResultsDir, { recursive: true })

  const payload = {
    label,
    metrics,
    timestamp: new Date().toISOString(),
    project: testInfo.project.name,
    workerIndex: testInfo.workerIndex,
    baseURL: testInfo.project.use.baseURL || null,
  }

  const filename = `perf-${label}-worker-${testInfo.workerIndex}.json`
  fs.writeFileSync(
    path.join(perfResultsDir, filename),
    JSON.stringify(payload, null, 2)
  )
}

const assertBudgets = (label: string, metrics: PerfMetrics) => {
  if (!shouldEnforceBudgets) return

  const budget = PERF_BUDGETS[label]
  if (!budget) return

  const check = (key: keyof PerfMetrics) => {
    const max = budget[key]
    if (max === undefined) return
    expect(
      metrics[key],
      `Performance budget exceeded: ${label}.${key} = ${metrics[key]} (budget ${max})`
    ).toBeLessThanOrEqual(max)
  }

  ;(
    [
      'ttfb',
      'domContentLoaded',
      'load',
      'fcp',
      'lcp',
      'cls',
      'resourceCount',
      'totalTransferKb',
    ] as const
  ).forEach(check)
}

const runPerfScenario = async ({
  page,
  label,
  route,
  waitForSelector,
}: {
  page: Page
  label: string
  route: string
  waitForSelector: string
}) => {
  await setupPerfObservers(page)
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(waitForSelector, { timeout: 30000 })
  await page.waitForTimeout(800)

  const metrics = await collectPerfMetrics(page)
  const testInfo = test.info()

  persistMetrics(label, metrics, testInfo)
  assertBudgets(label, metrics)

  expect(metrics.ttfb).toBeGreaterThan(0)
  expect(metrics.resourceCount).toBeGreaterThan(0)
}

test.describe('Performance budgets (page load)', () => {
  test('Landing page', async ({ page }) => {
    await runPerfScenario({
      page,
      label: 'landing',
      route: '/',
      waitForSelector: 'header',
    })
  })

  test('Login page', async ({ page }) => {
    await runPerfScenario({
      page,
      label: 'login',
      route: '/login',
      waitForSelector: '[data-testid="login-form"]',
    })
  })

  test('Dashboard (authenticated)', async ({ page }) => {
    const auth = createAuthHelper(page)
    await auth.login(TEST_USERS.withHousehold)

    await runPerfScenario({
      page,
      label: 'dashboard',
      route: '/dashboard',
      waitForSelector: '[data-testid="dashboard-content"]',
    })
  })
})
