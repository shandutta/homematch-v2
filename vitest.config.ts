import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globalSetup: ['./vitest.globalSetup.ts'],
    include: [
      '__tests__/integration/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '__tests__/accessibility/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    exclude: [
      '**/homematch-original-analysis/**',
      '**/node_modules/**',
      '**/*.skip.*',
      '**/.claude/worktrees/**',
      '__tests__/accessibility/household-clipboard-a11y.test.tsx',
      '__tests__/integration/ui/household-clipboard.test.tsx',
      '__tests__/integration/error-scenarios/household-clipboard-errors.test.tsx',
      '__tests__/e2e/**/*.spec.ts', // Exclude Playwright e2e tests from Vitest (they run separately)
      '__tests__/e2e/**/*.test.ts', // Exclude ALL e2e test files from Vitest
      // CI quarantine — pre-existing failing tests (NOT introduced by recent work).
      // These need individual refactors to be moved out of this list:
      // Category A (fetch→NextRequest) un-quarantined by agent in
      // commits aaecde9..9ce862c. Remaining quarantine is just B/C/D.
      // See follow-up: reports/home-match-revival/ci-quarantine-2026-05-11.md
    ],
    environment: 'jsdom', // Keep jsdom for most tests
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    reporters: [
      'default',
      './scripts/vitest-progress-reporter.ts',
      './scripts/vitest-timestamp-logger.ts',
    ],
    testTimeout: 60000, // 60 seconds for individual tests (increased for HTTP requests)
    hookTimeout: 90000, // 90 seconds for beforeAll/afterAll hooks (increased for auth setup)
    // Use threads with singleThread for memory efficiency in CI. Each
    // fork-based worker spawns a fresh Node process (~300-500MB each);
    // combined with Supabase containers (~2GB) + Next.js dev server
    // (~500MB-1GB) on a 7GB ubuntu-latest runner, the integration test
    // job OOMs (exit 137). Threads share the parent's heap so we stay
    // under budget. (2026-05-11)
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
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
