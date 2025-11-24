import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

// Load test environment variables with fallbacks
const envCandidates = ['.env.test.local', '.env.prod', '.env.local']
const loadedEnvFiles: string[] = []

for (const file of envCandidates) {
  const envPath = path.resolve(__dirname, file)
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
    loadedEnvFiles.push(file)
  }
}

if (!loadedEnvFiles.length) {
  // Avoid failing when the test env file is absent; fall back to shell env.
  console.warn(
    '⚠️  No env file found for Playwright (.env.test.local/.env.local/.env.prod); relying on existing environment variables.'
  )
}

const cpuCount = os.cpus()?.length || 1
const totalMemGb = Math.round(os.totalmem() / 1024 / 1024 / 1024)
const freeMemGb = Math.round(os.freemem() / 1024 / 1024 / 1024)
const isCI = !!process.env.CI
const localWorkerCap = Number(process.env.PLAYWRIGHT_WORKER_CAP || 32)
const envRequestedWorkers = Number(process.env.PLAYWRIGHT_WORKERS)
const hasValidWorkerOverride =
  Number.isFinite(envRequestedWorkers) && envRequestedWorkers > 0
const workers = hasValidWorkerOverride
  ? Math.floor(envRequestedWorkers)
  : isCI
    ? 2
    : Math.max(1, Math.min(cpuCount, localWorkerCap))
const workerSource = hasValidWorkerOverride
  ? 'PLAYWRIGHT_WORKERS override'
  : isCI
    ? 'CI default (2)'
    : `auto based on logical cores (capped at ${localWorkerCap})`

// Only log from main process to avoid spamming logs (config is loaded by each worker)
if (!process.env.TEST_WORKER_INDEX) {
  console.log(
    `🧪 Playwright: ${cpuCount} logical cores, ${totalMemGb}GB RAM (${freeMemGb}GB free). Workers=${workers} (${workerSource}).`
  )
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/api/**', // Exclude API tests - they run with Vitest
  globalSetup: './scripts/global-setup.js',
  globalTeardown: './scripts/global-teardown.js',

  // OPTIMIZED TIMEOUT CONFIGURATION - Balanced for speed and reliability
  timeout: isCI ? 120000 : 60000, // 60s locally (fail fast), 120s CI
  expect: {
    timeout: isCI ? 30000 : 15000, // 15s locally, 30s CI
  },

  /* Run tests in files in parallel */
  fullyParallel: true, // Enabled with per-worker auth isolation
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry strategy: CI retries flaky tests, local dev should fix them */
  retries: isCI ? 2 : 0, // No retries locally - fix flaky tests instead
  /* Optimal parallel workers for performance */
  workers, // Auto-scales to detected logical cores locally; override with PLAYWRIGHT_WORKERS
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [['html', { open: 'never' }]]
    : [
        ['list'], // live progress locally so we can see stalls
        ['html', { open: 'never' }], // keep HTML report for inspection
      ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: isCI ? 'on-first-retry' : 'off', // Skip traces locally for speed

    // OPTIMIZED ACTION TIMEOUTS - Fail fast locally, generous in CI
    actionTimeout: isCI ? 30000 : 15000, // 15s locally, 30s CI
    navigationTimeout: isCI ? 60000 : 30000, // 30s locally, 60s CI

    /* Make environment variables available to tests */
    extraHTTPHeaders: {
      // This ensures environment variables are available in the test context
    },
  },

  /* Configure projects for major browsers */
  /* LOCAL: Only Chromium for speed (3x faster). CI: All browsers for compatibility */
  projects: [
    // Setup project for auth state preparation
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    // Cleanup project to clean auth states
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // Firefox and WebKit only run in CI (or when PLAYWRIGHT_ALL_BROWSERS=true)
    ...(isCI || process.env.PLAYWRIGHT_ALL_BROWSERS
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            dependencies: ['setup'],
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            dependencies: ['setup'],
          },
        ]
      : []),

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'node scripts/start-test-server-optimized.js',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: isCI ? 120 * 1000 : 60 * 1000, // 60s locally, 120s CI
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_TEST_MODE: 'true',
      FORCE_COLOR: '0',
      // Pass Supabase environment variables
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
  },
})
