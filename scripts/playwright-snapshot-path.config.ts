import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './playwright-snapshot-path-tests',
  testMatch: '**/*.spec.ts',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
