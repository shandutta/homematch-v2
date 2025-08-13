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

// Mock framer-motion for tests
jest.mock('framer-motion', () => {
  const React = require('react')

  // List of Framer Motion specific props to filter out
  const motionProps = [
    'initial',
    'animate',
    'exit',
    'transition',
    'variants',
    'whileHover',
    'whileTap',
    'whileFocus',
    'whileDrag',
    'whileInView',
    'drag',
    'dragConstraints',
    'dragElastic',
    'dragMomentum',
    'onAnimationStart',
    'onAnimationComplete',
    'onDragStart',
    'onDragEnd',
    'layout',
    'layoutId',
    'layoutDependency',
    'layoutScroll',
    'style',
    'transformTemplate',
    'transformValues',
    'custom',
  ]

  // Helper to filter out motion props
  const filterMotionProps = (props) => {
    const filteredProps = {}
    for (const key in props) {
      // Skip all motion-specific props
      if (!motionProps.includes(key)) {
        filteredProps[key] = props[key]
      }
    }
    return filteredProps
  }

  // Create motion components that filter props
  const createMotionComponent = (Component) => {
    return React.forwardRef((props, ref) => {
      const filteredProps = filterMotionProps(props)
      return React.createElement(Component, { ...filteredProps, ref })
    })
  }

  return {
    motion: {
      div: createMotionComponent('div'),
      button: createMotionComponent('button'),
      span: createMotionComponent('span'),
      section: createMotionComponent('section'),
      article: createMotionComponent('article'),
      header: createMotionComponent('header'),
      footer: createMotionComponent('footer'),
      main: createMotionComponent('main'),
      nav: createMotionComponent('nav'),
      aside: createMotionComponent('aside'),
      img: createMotionComponent('img'),
      a: createMotionComponent('a'),
      p: createMotionComponent('p'),
      h1: createMotionComponent('h1'),
      h2: createMotionComponent('h2'),
      h3: createMotionComponent('h3'),
      ul: createMotionComponent('ul'),
      li: createMotionComponent('li'),
      form: createMotionComponent('form'),
      input: createMotionComponent('input'),
      label: createMotionComponent('label'),
    },
    AnimatePresence: ({ children }) => children,
    useMotionValue: () => ({
      get: jest.fn(() => 0),
      set: jest.fn(),
    }),
    useTransform: () => ({
      get: jest.fn(() => 0),
      set: jest.fn(),
    }),
    useAnimation: () => ({
      start: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      stop: jest.fn(),
    }),
    useSpring: () => ({
      get: jest.fn(() => 0),
      set: jest.fn(),
    }),
    useScroll: () => ({
      scrollX: { get: jest.fn(() => 0) },
      scrollY: { get: jest.fn(() => 0) },
      scrollXProgress: { get: jest.fn(() => 0) },
      scrollYProgress: { get: jest.fn(() => 0) },
    }),
    useInView: () => false,
    useDragControls: () => ({
      start: jest.fn(),
    }),
    useMotionTemplate: () => '',
    useReducedMotion: () => false,
    usePresence: () => [true, null],
  }
})

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
