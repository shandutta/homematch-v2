import '@testing-library/jest-dom'
import * as React from 'react'
import { setupBrowserMocks } from './__tests__/utils/browser-mocks'
import './__tests__/setupSupabaseMock'

// Initialize shared browser mocks (TextEncoder, ResizeObserver, matchMedia, etc.)
setupBrowserMocks()

// Handle React 19 AggregateError in tests
global.AggregateError =
  global.AggregateError ||
  class AggregateError extends Error {
    errors: unknown[]

    constructor(errors: unknown[], message?: string) {
      super(message)
      this.name = 'AggregateError'
      this.errors = errors
    }
  }

// Add error boundary for React 19 compatibility
const originalConsoleError = console.error
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isString = (value: unknown): value is string => typeof value === 'string'

const getMessage = (value: unknown): string | null => {
  if (!isRecord(value)) return null
  const message = value.message
  return typeof message === 'string' ? message : null
}

console.error = (...args: unknown[]) => {
  // Suppress React 19 AggregateError warnings in tests
  if (isString(args[0]) && args[0].includes('AggregateError')) {
    return
  }
  // Suppress React act() warnings in tests - these are expected in form tests
  if (isString(args[0]) && args[0].includes('not wrapped in act(...)')) {
    return
  }
  // Suppress jsdom navigation warnings
  const message = getMessage(args[0])
  if (message && message.includes('Not implemented: navigation')) {
    return
  }
  // Suppress Framer Motion prop warnings - these are expected when mocking
  if (
    isString(args[0]) &&
    (args[0].includes('whileHover') ||
      args[0].includes('whileInView') ||
      args[0].includes('React does not recognize'))
  ) {
    return
  }
  // Suppress Radix UI React 19 compatibility warnings
  if (
    isString(args[0]) &&
    (args[0].includes('validateDOMNesting') ||
      args[0].includes('portal') ||
      args[0].includes('dialog'))
  ) {
    return
  }
  // Suppress React 19 concurrent rendering warnings in tests
  if (
    isString(args[0]) &&
    (args[0].includes('concurrent rendering') || args[0].includes('flushSync'))
  ) {
    return
  }
  // Suppress expected API route error logging in tests (ZodError validation, etc.)
  // Jest's console has issues serializing ZodError objects, causing "Cannot read properties of undefined"
  if (
    isString(args[0]) &&
    (args[0].includes('Error in couples notification API') ||
      args[0].includes('Invalid request data'))
  ) {
    return
  }
  // Suppress expected VibesService parse errors in tests
  if (
    isString(args[0]) &&
    args[0].includes('[VibesService] Failed to parse/validate LLM response')
  ) {
    return
  }
  originalConsoleError.apply(console, args)
}

jest.mock('framer-motion')

// Global Clerk mocks — server-side Clerk pulls @clerk/backend which uses
// .mjs exports that ts-jest can't transform in jsdom. Most unit tests
// don't exercise auth; they just need the imports to resolve.
jest.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: null }),
  currentUser: () => Promise.resolve(null),
  clerkMiddleware:
    (
      handler: (
        clerkAuth: () => Promise<{ userId: string | null }>,
        request: unknown
      ) => unknown
    ) =>
    async (request: unknown) =>
      handler(() => Promise.resolve({ userId: null }), request),
  createRouteMatcher:
    () =>
    () =>
      false,
  verifyWebhook: jest.fn(),
}))
jest.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }: { children: unknown }) => children,
  SignIn: () => null,
  SignUp: () => null,
  SignOutButton: ({ children }: { children: unknown }) => children,
  useClerk: () => ({ signOut: jest.fn() }),
  useAuth: () => ({ userId: null, isLoaded: true, isSignedIn: false }),
  useUser: () => ({ user: null, isLoaded: true, isSignedIn: false }),
}))

// Add global test helpers
global.beforeEach = global.beforeEach || (() => {})
global.afterEach = global.afterEach || (() => {})

// Mock React.act for React 19 compatibility
if (!global.React) {
  global.React = React
}

// Ensure proper cleanup between tests
beforeEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()

  // Re-apply mocks that might be cleared by restoreAllMocks if they are attached to globals
  // However, our setupBrowserMocks uses defineProperty which persists.
  // We just need to handle method mocks if they were overwritten.
})

afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
  // Additional cleanup for React 19
  if (global.gc) {
    global.gc()
  }
})
