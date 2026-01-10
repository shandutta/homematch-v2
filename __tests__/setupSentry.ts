/**
 * Comprehensive Sentry Mock for Jest Testing
 * Supports all Sentry methods used in error boundaries
 */

import type { ComponentType, ReactNode } from 'react'

// Mock Sentry scope object
const createMockScope = () => {
  type ScopeMethod = (...args: unknown[]) => Scope
  type Scope = {
    setContext: ScopeMethod
    setTag: ScopeMethod
    setLevel: ScopeMethod
    setUser: ScopeMethod
    setExtra: ScopeMethod
    setFingerprint: ScopeMethod
    addBreadcrumb: ScopeMethod
    clearBreadcrumbs: ScopeMethod
    setSpan: ScopeMethod
    getSpan: () => null
    clear: ScopeMethod
  }

  const scope: Scope = {
    setContext: jest.fn(() => scope),
    setTag: jest.fn(() => scope),
    setLevel: jest.fn(() => scope),
    setUser: jest.fn(() => scope),
    setExtra: jest.fn(() => scope),
    setFingerprint: jest.fn(() => scope),
    addBreadcrumb: jest.fn(() => scope),
    clearBreadcrumbs: jest.fn(() => scope),
    setSpan: jest.fn(() => scope),
    getSpan: jest.fn(() => null),
    clear: jest.fn(() => scope),
  }

  return scope
}

// Main Sentry mock
jest.mock('@sentry/nextjs', () => {
  const _mockScope = createMockScope()

  return {
    captureException: jest.fn((_error, _captureContext) => {
      // Return a mock event ID
      return 'mock-event-id-' + Date.now()
    }),

    captureMessage: jest.fn((_message, _level) => {
      // Return a mock event ID
      return 'mock-event-id-' + Date.now()
    }),

    captureEvent: jest.fn((_event) => {
      // Return a mock event ID
      return 'mock-event-id-' + Date.now()
    }),

    withScope: jest.fn((callback) => {
      // Create a new scope for each withScope call
      const scope = createMockScope()
      if (callback && typeof callback === 'function') {
        callback(scope)
      }
      return scope
    }),

    configureScope: jest.fn((callback) => {
      const scope = createMockScope()
      if (callback && typeof callback === 'function') {
        callback(scope)
      }
      return scope
    }),

    setContext: jest.fn(),
    setTag: jest.fn(),
    setTags: jest.fn(),
    setExtra: jest.fn(),
    setExtras: jest.fn(),
    setUser: jest.fn(),

    addBreadcrumb: jest.fn(),

    // Severity levels enum
    Severity: {
      Fatal: 'fatal',
      Error: 'error',
      Warning: 'warning',
      Log: 'log',
      Info: 'info',
      Debug: 'debug',
      Critical: 'critical',
    },

    // Hub methods
    getCurrentHub: jest.fn(() => ({
      getClient: jest.fn(() => ({
        getOptions: jest.fn(() => ({})),
        close: jest.fn(() => Promise.resolve(true)),
        flush: jest.fn(() => Promise.resolve(true)),
      })),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      captureEvent: jest.fn(),
      addBreadcrumb: jest.fn(),
      setContext: jest.fn(),
      setExtra: jest.fn(),
      setTag: jest.fn(),
      setUser: jest.fn(),
    })),

    // Browser specific
    showReportDialog: jest.fn(),

    // Transport and client
    close: jest.fn(() => Promise.resolve(true)),
    flush: jest.fn(() => Promise.resolve(true)),

    // Integrations
    Integrations: {},

    // Transaction methods
    startTransaction: jest.fn(() => ({
      setName: jest.fn(),
      setOp: jest.fn(),
      setStatus: jest.fn(),
      finish: jest.fn(),
    })),

    // Additional utilities
    lastEventId: jest.fn(() => 'mock-event-id'),

    // React ErrorBoundary specific
    ErrorBoundary: ({
      children,
    }: {
      children?: ReactNode
      fallback?: ReactNode
    }) => children,
    withErrorBoundary: (component: ComponentType<unknown>) => component,
  }
})

// Also mock @sentry/react for any React-specific imports
jest.mock('@sentry/react', () => {
  const nextjsMock = jest.requireMock('@sentry/nextjs')
  return {
    ...nextjsMock,
    ErrorBoundary: ({
      children,
    }: {
      children?: ReactNode
      fallback?: ReactNode
    }) => children,
    withErrorBoundary: (component: ComponentType<unknown>) => component,
    useErrorBoundary: () => ({
      resetBoundary: jest.fn(),
      showBoundary: jest.fn(),
    }),
  }
})

// Export for use in tests
export const mockSentry = jest.requireMock('@sentry/nextjs')
export const createSentryScope = createMockScope
