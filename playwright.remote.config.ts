import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '__tests__/e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  // Remote run: no local infra or Docker
  globalSetup: undefined,
  webServer: undefined,
  use: {
    // We will run Next.js locally but point it to remote Supabase via .env.local.remote-test
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: ['--disable-setuid-sandbox'],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
