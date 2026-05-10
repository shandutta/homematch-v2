/**
 * TP0 Playwright config — no-auth public-page smoke + redirect guard
 *
 * Runs against the local dev server on port 3000.
 * No global setup / teardown — no test-user seeding required.
 */

import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

const envCandidates = ['.env.test.local', '.env.local']
for (const file of envCandidates) {
  const envPath = path.resolve(__dirname, file)
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: file === '.env.test.local' })
    break
  }
}

const baseUrl = 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: 'tp0-public-pages.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],

  use: {
    baseURL: baseUrl,
    trace: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    ...devices['Desktop Chrome'],
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'node scripts/start-test-server-optimized.js',
    url: `${baseUrl}/api/health`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_TEST_MODE: 'true',
      BASE_URL: baseUrl,
      SKIP_SUPABASE_GUARD: 'true',
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54200',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        '',
    },
  },
})
