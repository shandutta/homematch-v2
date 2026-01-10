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

// Simple framer-motion mock for remaining edge cases
jest.mock('framer-motion', () => {
  // Strip motion-only props so React DOM doesn't warn during tests
  const createMotionComponent = (element: keyof JSX.IntrinsicElements) => {
    const MotionComponent = React.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
        const {
          animate: _animate,
          initial: _initial,
          exit: _exit,
          variants: _variants,
          whileHover: _whileHover,
          whileTap: _whileTap,
          whileInView: _whileInView,
          transition: _transition,
          drag: _drag,
          dragConstraints: _dragConstraints,
          dragElastic: _dragElastic,
          dragTransition: _dragTransition,
          layout: _layout,
          layoutId: _layoutId,
          transformTemplate: _transformTemplate,
          onUpdate: _onUpdate,
          onAnimationComplete: _onAnimationComplete,
          viewport: _viewport,
          ...rest
        } = props

        return React.createElement(element, { ref, ...rest })
      }
    )

    MotionComponent.displayName = `Motion(${element})`
    return MotionComponent
  }

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
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
    useScroll: () => ({ scrollY: { get: () => 0 } }),
    useTransform: () => 0,
    useMotionValue: <T>(initial: T) => ({
      get: () => initial,
      set: jest.fn(),
    }),
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
    useInView: () => false,
  }
})

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

const ensureFetch = async () => {
  if (typeof global.fetch !== 'undefined') {
    return
  }
  const { fetch, Headers, Request, Response } = await import('undici')
  Object.defineProperty(global, 'fetch', { value: fetch })
  Object.defineProperty(global, 'Request', { value: Request })
  Object.defineProperty(global, 'Response', { value: Response })
  Object.defineProperty(global, 'Headers', { value: Headers })
}

beforeAll(async () => {
  await ensureFetch()
})
