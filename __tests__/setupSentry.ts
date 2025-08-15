/**
 * Comprehensive Sentry Mock for Jest Testing
 * Supports all Sentry methods used in error boundaries
 */

// Mock Sentry scope object
const createMockScope = () => {
  const scope = {
    setContext: jest.fn(function(this: any) { return this }),
    setTag: jest.fn(function(this: any) { return this }),
    setLevel: jest.fn(function(this: any) { return this }),
    setUser: jest.fn(function(this: any) { return this }),
    setExtra: jest.fn(function(this: any) { return this }),
    setFingerprint: jest.fn(function(this: any) { return this }),
    addBreadcrumb: jest.fn(function(this: any) { return this }),
    clearBreadcrumbs: jest.fn(function(this: any) { return this }),
    setSpan: jest.fn(function(this: any) { return this }),
    getSpan: jest.fn(() => null),
    clear: jest.fn(function(this: any) { return this }),
  }
  
  // Ensure all methods return the scope for chaining
  Object.keys(scope).forEach(key => {
    if (typeof scope[key as keyof typeof scope] === 'function') {
      const originalFn = scope[key as keyof typeof scope]
      scope[key as keyof typeof scope] = jest.fn((...args: any[]) => {
        (originalFn as any).apply(this, args)
        return scope
      }) as any
    }
  })
  
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
    ErrorBoundary: ({ children, fallback: _fallback }: any) => children,
    withErrorBoundary: (component: any) => component,
  }
})

// Also mock @sentry/react for any React-specific imports
jest.mock('@sentry/react', () => {
  const nextjsMock = jest.requireMock('@sentry/nextjs')
  return {
    ...nextjsMock,
    ErrorBoundary: ({ children, fallback: _fallback }: any) => children,
    withErrorBoundary: (component: any) => component,
    useErrorBoundary: () => ({
      resetBoundary: jest.fn(),
      showBoundary: jest.fn(),
    }),
  }
})

// Export for use in tests
export const mockSentry = jest.requireMock('@sentry/nextjs')
export const createSentryScope = createMockScope