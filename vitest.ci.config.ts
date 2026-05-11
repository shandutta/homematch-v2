import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
    hookTimeout: 10000,
    sequence: {
      concurrent: true,
    },
    // CI memory budget: ubuntu-latest runners have ~7GB and we share with
    // Supabase containers (~2-3GB) + Next.js dev server (~500MB). Each
    // vitest worker can use 500MB-1GB, so 4 workers tips over to OOM
    // (exit 137). Cap at 2 to stay under the budget. (2026-05-11)
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 2,
        minThreads: 1,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
      ],
    },
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-reports/integration-results.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/__tests__': path.resolve(__dirname, './__tests__'),
    },
  },
})
