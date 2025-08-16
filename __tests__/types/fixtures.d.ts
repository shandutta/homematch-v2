/**
 * Global test types for HomeMatch V2
 */

// Extend Jest matchers with @testing-library/jest-dom types so TS recognizes
// toBeInTheDocument, toHaveAttribute, etc. in unit tests.
import '@testing-library/jest-dom'

// Extend Jest matchers with @testing-library/jest-dom types so TS recognizes
// toBeInTheDocument, toHaveAttribute, etc. in unit tests.
import '@testing-library/jest-dom'

// Test user interface
export interface TestUser {
  email: string
  password: string
}

// Logger interface
export interface TestLogger {
  step: (description: string, data?: any) => void
  info: (category: string, message: string, data?: any) => void
  warn: (category: string, message: string, data?: any) => void
  error: (category: string, message: string, data?: any) => void
  navigation: (
    url: string,
    status: 'start' | 'complete' | 'error',
    data?: any
  ) => void
  auth: (
    action: string,
    status: 'start' | 'success' | 'failure',
    data?: any
  ) => void
  getSummary: () => string
  saveToFile: (filePath?: string) => void
}

// Utils fixture interface
export interface UtilsFixture {
  clearAuthState: () => Promise<void>
  waitForReactToSettle: () => Promise<void>
  waitForFormValidation: () => Promise<void>
  navigateWithRetry: (
    url: string,
    options?: { retries?: number }
  ) => Promise<void>
  isAuthenticated: () => Promise<boolean>
  waitForAuthRedirect: (
    expectedUrl: string | RegExp,
    options?: { timeout?: number; errorMessage?: string }
  ) => Promise<void>
}

// Auth fixture interface
export interface AuthFixture {
  login: (user?: TestUser) => Promise<void>
  loginIfNeeded: (user?: TestUser) => Promise<void>
  logout: () => Promise<void>
  fillLoginForm: (user?: TestUser) => Promise<void>
  verifyAuthenticated: (user?: TestUser) => Promise<void>
  verifyNotAuthenticated: () => Promise<void>
  clearAuthState: () => Promise<void>
}

// Retry fixture interface
export interface RetryFixture {
  retry: <T>(
    operation: () => Promise<T>,
    options?: {
      maxAttempts?: number
      delay?: number
      backoff?: 'linear' | 'exponential'
      onRetry?: (error: Error, attempt: number) => void
      shouldRetry?: (error: Error) => boolean
    }
  ) => Promise<T>
  network: <T>(operation: () => Promise<T>) => Promise<T>
  element: <T>(operation: () => Promise<T>) => Promise<T>
  auth: <T>(operation: () => Promise<T>) => Promise<T>
  withTimeout: <T>(operation: () => Promise<T>, timeout?: number) => Promise<T>
}

// Config fixture interface
export interface ConfigFixture {
  baseUrl: string
  timeouts: {
    PAGE_LOAD: number
    NAVIGATION: number
    AUTH_REDIRECT: number
    AUTH_LOGOUT: number
    BUTTON_ENABLED: number
    ELEMENT_VISIBLE: number
    FORM_VALIDATION: number
    NETWORK_IDLE: number
  }
  users: {
    user1: TestUser
    user2: TestUser
  }
  storageKeys: {
    SUPABASE_AUTH_TOKEN: string
    SUPABASE_AUTH_REFRESH_TOKEN: string
  }
}

// Combined fixtures interface
export interface HomematchFixtures {
  utils: UtilsFixture
  auth: AuthFixture
  retry: RetryFixture
  config: ConfigFixture
  logger: TestLogger
}
