import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['__tests__/integration/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['**/homematch-original-analysis/**', '**/node_modules/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
