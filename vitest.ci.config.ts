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
    // Supabase containers (~2-3GB) + Next.js dev server (~500MB). Vitest
    // with maxThreads=4 (default) OOMs (exit 137); maxThreads=2 still
    // OOMs. Drop to singleThread for CI — slower but stable. (2026-05-11)
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
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
