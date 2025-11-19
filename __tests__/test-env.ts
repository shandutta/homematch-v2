/**
 * Test Environment Configuration
 * Ensures all required environment variables are set for testing
 */

// Store original env for restoration if needed
const originalEnv = { ...process.env }

// Set up test environment variables
export const setupTestEnvironment = () => {
  process.env = {
    ...originalEnv,
    // Node environment
    NODE_ENV: 'test',

    // App URLs
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    APP_URL: 'http://localhost:3000',

    // Supabase configuration
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-for-testing-only',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-for-testing-only',

    // Google Maps
    GOOGLE_MAPS_SERVER_API_KEY: 'test-google-maps-key-server',

    // Zillow/RapidAPI
    RAPIDAPI_KEY: 'test-rapidapi-key',
    RAPIDAPI_HOST: 'zillow-com1.p.rapidapi.com',

    // Analytics (optional)
    NEXT_PUBLIC_GA_MEASUREMENT_ID: 'G-TEST123456',
    NEXT_PUBLIC_POSTHOG_KEY: 'test-posthog-key',
    NEXT_PUBLIC_POSTHOG_HOST: 'https://app.posthog.com',

    // Feature flags
    NEXT_PUBLIC_ENABLE_ANALYTICS: 'false',
    NEXT_PUBLIC_ENABLE_SENTRY: 'false',
    NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: 'false',

    // Test-specific flags
    IS_TEST_ENV: 'true',
    SUPPRESS_TEST_WARNINGS: 'true',

    // Database (for integration tests)
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:54322/postgres',

    // Redis (if used)
    REDIS_URL: 'redis://localhost:6379',

    // Rate limiting
    RATE_LIMIT_ENABLED: 'false',

    // Logging
    LOG_LEVEL: 'error', // Reduce noise in tests
  }
}

// Reset environment to original state
export const resetTestEnvironment = () => {
  process.env = { ...originalEnv }
}

// Validate required environment variables
export const validateTestEnvironment = () => {
  const required = [
    'NODE_ENV',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.warn(`Missing test environment variables: ${missing.join(', ')}`)
  }

  return missing.length === 0
}

// Mock environment for specific test scenarios
export const mockEnvironment = (overrides: Record<string, string>) => {
  Object.entries(overrides).forEach(([key, value]) => {
    process.env[key] = value
  })
}

// Helper to suppress console warnings in tests
export const suppressConsoleWarnings = () => {
  const originalWarn = console.warn
  const originalError = console.error

  beforeAll(() => {
    console.warn = jest.fn((message, ...args) => {
      // Only show warnings that aren't test-related noise
      if (
        !message?.includes('environment variable') &&
        !message?.includes('Missing translation') &&
        !message?.includes('React Router Future Flag') &&
        !message?.includes('Supabase client')
      ) {
        originalWarn(message, ...args)
      }
    })

    console.error = jest.fn((message, ...args) => {
      // Filter out expected test errors
      if (
        !message?.includes('Not implemented: navigation') &&
        !message?.includes('Not implemented: HTMLFormElement.submit') &&
        !message?.includes('Error: Uncaught [') // Error boundary tests
      ) {
        originalError(message, ...args)
      }
    })
  })

  afterAll(() => {
    console.warn = originalWarn
    console.error = originalError
  })
}

// Helper for async test timeouts
export const testTimeout = {
  short: 5000,
  medium: 10000,
  long: 30000,
}

// Export test utilities
export const testUtils = {
  waitForNextTick: () => new Promise((resolve) => process.nextTick(resolve)),
  waitForTimeout: (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
  flushPromises: () => new Promise((resolve) => setImmediate(resolve)),
}

// Auto-setup for all tests
if (process.env.NODE_ENV === 'test') {
  setupTestEnvironment()
}
