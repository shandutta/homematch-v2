import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: [
      '__tests__/e2e/api/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/*.skip.*',
    ],
    environment: 'node', // API tests don't need jsdom
    globals: true,
    setupFiles: ['./vitest.e2e.setup.ts'],
    testTimeout: 30000, // 30 seconds for individual tests
    hookTimeout: 60000, // 60 seconds for beforeAll/afterAll hooks
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/__tests__': path.resolve(__dirname, '__tests__'),
    },
  },
})