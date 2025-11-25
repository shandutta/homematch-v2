import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: [
      '__tests__/integration/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '__tests__/accessibility/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '__tests__/e2e/api/**/*.{test,spec}.{js,jsx,ts,tsx}', // Include E2E API tests
    ],
    exclude: [
      '**/homematch-original-analysis/**',
      '**/node_modules/**',
      '**/*.skip.*',
      '__tests__/accessibility/household-clipboard-a11y.test.tsx',
      '__tests__/integration/ui/household-clipboard.test.tsx',
      '__tests__/integration/error-scenarios/household-clipboard-errors.test.tsx',
      '__tests__/e2e/**/*.spec.ts', // Exclude Playwright e2e tests from Vitest (they run separately)
      '__tests__/e2e/**/*.test.ts', // Exclude ALL e2e test files from Vitest
      '!__tests__/e2e/api/**/*.spec.ts', // But include API tests (spec files only)
      '!__tests__/e2e/api/**/*.test.ts', // But include API tests (test files only)
    ],
    environment: 'jsdom', // Keep jsdom for most tests
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 45000, // 45 seconds for individual tests (increased for HTTP requests)
    hookTimeout: 90000, // 90 seconds for beforeAll/afterAll hooks (increased for auth setup)
    // Use forks pool to allow execArgv for suppressing Node experimental warnings
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run test files sequentially to avoid race conditions
        isolate: true, // Isolate globals between tests
        execArgv: ['--disable-warning=ExperimentalWarning'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/__tests__': path.resolve(__dirname, '__tests__'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
})
