import '@testing-library/jest-dom'

// Import and setup our comprehensive typed Supabase mock
require('./__tests__/setupSupabaseMock')

// Handle React 19 AggregateError in tests
global.AggregateError =
  global.AggregateError ||
  class AggregateError extends Error {
    constructor(errors, message) {
      super(message)
      this.name = 'AggregateError'
      this.errors = errors
    }
  }

// Add error boundary for React 19 compatibility
const originalConsoleError = console.error
console.error = (...args) => {
  // Suppress React 19 AggregateError warnings in tests
  if (args[0] && args[0].includes && args[0].includes('AggregateError')) {
    return
  }
  // Suppress React act() warnings in tests - these are expected in form tests
  if (
    args[0] &&
    args[0].includes &&
    args[0].includes('not wrapped in act(...)')
  ) {
    return
  }
  // Suppress jsdom navigation warnings
  if (
    args[0] &&
    args[0].message &&
    args[0].message.includes('Not implemented: navigation')
  ) {
    return
  }
  // Suppress Framer Motion prop warnings - these are expected when mocking
  if (
    args[0] &&
    args[0].includes &&
    (args[0].includes('whileHover') ||
      args[0].includes('whileInView') ||
      args[0].includes('React does not recognize'))
  ) {
    return
  }
  // Suppress Radix UI React 19 compatibility warnings
  if (
    args[0] &&
    args[0].includes &&
    (args[0].includes('validateDOMNesting') ||
      args[0].includes('portal') ||
      args[0].includes('dialog'))
  ) {
    return
  }
  // Suppress React 19 concurrent rendering warnings in tests
  if (
    args[0] &&
    args[0].includes &&
    (args[0].includes('concurrent rendering') || args[0].includes('flushSync'))
  ) {
    return
  }
  originalConsoleError.apply(console, args)
}

// Mock clipboard API globally with proper async behavior - make it configurable for userEvent
Object.defineProperty(global.navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
  writable: true,
  configurable: true,
})

// Simple framer-motion mock for remaining edge cases
jest.mock('framer-motion', () => {
  return {
    motion: {
      div: 'div',
      span: 'span',
      section: 'section',
      article: 'article',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      p: 'p',
      ul: 'ul',
      li: 'li',
    },
    AnimatePresence: ({ children }) => children,
    useScroll: () => ({ scrollY: { get: () => 0 } }),
    useTransform: () => 0,
    useMotionValue: (initial) => ({ get: () => initial, set: jest.fn() }),
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
    useInView: () => false,
  }
})

// Add global test helpers
global.beforeEach = global.beforeEach || (() => {})
global.afterEach = global.afterEach || (() => {})

// Enhanced React 19 compatibility for async components
const React = require('react')

// Mock React.act for React 19 compatibility
if (!global.React) {
  global.React = React
}

// Add React 19 async component support - temporarily disabled for debugging
// const originalCreateElement = React.createElement
// React.createElement = function(type, props, ...children) {
//   // Handle async components more gracefully in tests
//   if (typeof type === 'function' && type.constructor && type.constructor.name === 'AsyncFunction') {
//     // Wrap async components to prevent test failures
//     return originalCreateElement('div', { 'data-testid': 'async-component-wrapper' }, ...children)
//   }
//   return originalCreateElement.apply(this, arguments)
// }

// Ensure proper cleanup between tests
beforeEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()

  // Re-setup Canvas mocks after restoreAllMocks clears them
  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = jest
      .fn()
      .mockImplementation((contextType) => {
        if (contextType === '2d') {
          return {
            createLinearGradient: jest.fn().mockReturnValue({
              addColorStop: jest.fn(),
            }),
            fillRect: jest.fn(),
            fillStyle: null,
          }
        }
        return null
      })

    HTMLCanvasElement.prototype.toDataURL = jest
      .fn()
      .mockReturnValue('data:image/png;base64,mockDataURL')
  }
})

afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
  // Additional cleanup for React 19
  if (global.gc) {
    global.gc()
  }
})

// Canvas mocks are now set up in beforeEach to avoid being cleared by restoreAllMocks

// Add TextEncoder/TextDecoder polyfill if needed
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

// Polyfill fetch for integration tests using node-fetch
if (typeof global.fetch === 'undefined') {
  const fetch = require('node-fetch')
  global.fetch = fetch
  global.Request = fetch.Request
  global.Response = fetch.Response
  global.Headers = fetch.Headers
}
