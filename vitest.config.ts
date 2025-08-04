import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: [
      '__tests__/integration/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '__tests__/accessibility/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    exclude: [
      '**/homematch-original-analysis/**',
      '**/node_modules/**',
      '**/*.skip.*',
      '__tests__/accessibility/household-clipboard-a11y.test.tsx',
      '__tests__/integration/ui/household-clipboard.test.tsx',
      '__tests__/integration/error-scenarios/household-clipboard-errors.test.tsx',
    ],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/__tests__': path.resolve(__dirname, './__tests__'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
})
