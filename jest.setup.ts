import '@testing-library/jest-dom'
import { setupBrowserMocks } from './__tests__/utils/browser-mocks'

// Initialize shared browser mocks (TextEncoder, ResizeObserver, matchMedia, etc.)
setupBrowserMocks()

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
  // Suppress expected API route error logging in tests (ZodError validation, etc.)
  // Jest's console has issues serializing ZodError objects, causing "Cannot read properties of undefined"
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('Error in couples notification API') ||
      args[0].includes('Invalid request data'))
  ) {
    return
  }
  // Suppress expected VibesService parse errors in tests
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    args[0].includes('[VibesService] Failed to parse/validate LLM response')
  ) {
    return
  }
  originalConsoleError.apply(console, args)
}

// Simple framer-motion mock for remaining edge cases
jest.mock('framer-motion', () => {
  const React = require('react')

  // Strip motion-only props so React DOM doesn't warn during tests
  const createMotionComponent = (element: keyof JSX.IntrinsicElements) =>
    React.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
        const {
          animate,
          initial,
          exit,
          variants,
          whileHover,
          whileTap,
          whileInView,
          transition,
          drag,
          dragConstraints,
          dragElastic,
          dragTransition,
          layout,
          layoutId,
          transformTemplate,
          onUpdate,
          onAnimationComplete,
          viewport,
          ...rest
        } = props

        return React.createElement(element, { ref, ...rest })
      }
    )

  return {
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
      section: createMotionComponent('section'),
      article: createMotionComponent('article'),
      button: createMotionComponent('button'),
      h1: createMotionComponent('h1'),
      h2: createMotionComponent('h2'),
      h3: createMotionComponent('h3'),
      p: createMotionComponent('p'),
      ul: createMotionComponent('ul'),
      li: createMotionComponent('li'),
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

// Polyfill fetch for integration tests using node-fetch
if (typeof global.fetch === 'undefined') {
  const fetch = require('node-fetch')
  global.fetch = fetch
  global.Request = fetch.Request
  global.Response = fetch.Response
  global.Headers = fetch.Headers
}
