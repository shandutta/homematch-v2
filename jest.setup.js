require('@testing-library/jest-dom')

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
  originalConsoleError.apply(console, args)
}

// Mock clipboard API globally
global.navigator = {
  ...global.navigator,
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
}

// Mock Canvas API for image-blur tests
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === '2d') {
    return {
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      fillRect: jest.fn(),
      fillStyle: null,
    }
  }
  return null
})

HTMLCanvasElement.prototype.toDataURL = jest.fn(
  () => 'data:image/png;base64,mockDataURL'
)

// Mock framer-motion to handle animation props in React 19
jest.mock('framer-motion', () => {
  const React = require('react')

  // List of all motion props to strip
  const motionProps = [
    'animate',
    'initial',
    'exit',
    'transition',
    'variants',
    'style',
    'whileHover',
    'whileTap',
    'whileDrag',
    'whileFocus',
    'whileInView',
    'drag',
    'dragConstraints',
    'dragElastic',
    'dragMomentum',
    'onAnimationStart',
    'onAnimationComplete',
    'onUpdate',
    'onDrag',
    'viewport',
    'layout',
    'layoutId',
  ]

  // Create a motion component that strips animation props
  const createMotionComponent = (element) => {
    const MotionComponent = ({ children, ...props }) => {
      // Strip all motion-specific props
      const cleanProps = { ...props }
      motionProps.forEach((prop) => {
        delete cleanProps[prop]
      })
      return React.createElement(element, cleanProps, children)
    }
    MotionComponent.displayName = `Motion${element.charAt(0).toUpperCase()}${element.slice(1)}`
    return MotionComponent
  }

  // Create motion object with all common HTML elements
  const motion = {}
  const htmlElements = [
    'div',
    'span',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'section',
    'article',
    'aside',
    'header',
    'footer',
    'nav',
    'main',
    'button',
    'a',
    'img',
    'ul',
    'ol',
    'li',
  ]

  htmlElements.forEach((element) => {
    motion[element] = createMotionComponent(element)
  })

  return {
    motion,
    AnimatePresence: ({ children }) => children,
    useAnimation: () => ({
      start: jest.fn(),
      stop: jest.fn(),
      set: jest.fn(),
    }),
    useInView: () => true,
    useScroll: () => ({ scrollY: { get: () => 0 } }),
    useTransform: () => 0,
  }
})

// Polyfill Request/Response/fetch for route handler tests (NextRequest compatibility)
try {
  const { Request, Response, fetch, Headers } = require('undici')
  if (typeof global.Request === 'undefined') {
    global.Request = Request
  }
  if (typeof global.Response === 'undefined') {
    global.Response = Response
  }
  if (typeof global.fetch === 'undefined') {
    global.fetch = fetch
  }
  if (typeof global.Headers === 'undefined') {
    global.Headers = Headers
  }
} catch {
  // undici not available; tests that rely on Request/Response may fail
}
