import { defineConfig, devices } from '@playwright/test'

const baseUrl =
  process.env.NO_AUTH_ACCESSIBILITY_BASE_URL || 'http://127.0.0.1:3100'

export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: 'no-auth-public-accessibility.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: baseUrl,
    trace: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command:
      'NEXT_PUBLIC_TEST_MODE=false NODE_ENV=test NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54200 NEXT_PUBLIC_SUPABASE_ANON_KEY=no-credential-smoke-key pnpm exec next dev --hostname 127.0.0.1 --port 3100',
    url: baseUrl,
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_TEST_MODE: 'false',
      NODE_ENV: 'test',
      NEXT_PUBLIC_ADSENSE_ENABLED: 'false',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54200',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'no-credential-smoke-key',
    },
  },
})
