// Mock implementation helper to handle environment differences
import { TextDecoder, TextEncoder } from 'util'

type MockFn<Args extends unknown[] = unknown[], Return = unknown> = ((
  ...args: Args
) => Return) & {
  mockReturnValue: (value: Return) => MockFn<Args, Return>
  mockResolvedValue: (value: Return) => MockFn<Args, Return>
  mockImplementation: (impl: (...args: Args) => Return) => MockFn<Args, Return>
}

const createMockFn = <
  Args extends unknown[] = unknown[],
  Return = unknown,
>(): MockFn<Args, Return> => {
  if (typeof jest !== 'undefined') {
    const fn: MockFn<Args, Return> = jest.fn()
    return fn
  }
  // Fallback to Vitest's global vi

  if (globalThis.vi) {
    const fn: MockFn<Args, Return> = globalThis.vi.fn()
    return fn
  }
  throw new Error('No test mock library found')
}

export const setupBrowserMocks = () => {
  // TextEncoder/TextDecoder Polyfill
  if (typeof globalThis.TextEncoder === 'undefined') {
    Object.defineProperty(globalThis, 'TextEncoder', {
      writable: true,
      configurable: true,
      value: TextEncoder,
    })
    Object.defineProperty(globalThis, 'TextDecoder', {
      writable: true,
      configurable: true,
      value: TextDecoder,
    })
  }

  // ResizeObserver Mock
  if (typeof global.ResizeObserver === 'undefined') {
    class MockResizeObserver {
      observe = createMockFn()
      unobserve = createMockFn()
      disconnect = createMockFn()
    }
    Object.defineProperty(global, 'ResizeObserver', {
      writable: true,
      configurable: true,
      value: MockResizeObserver,
    })
  }

  // matchMedia Mock
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'undefined'
  ) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: createMockFn<[string], MediaQueryList>().mockImplementation(
        (query) => {
          const list: MediaQueryList = {
            matches: false,
            media: query,
            onchange: null,
            addListener: createMockFn(), // deprecated
            removeListener: createMockFn(), // deprecated
            addEventListener: createMockFn(),
            removeEventListener: createMockFn(),
            dispatchEvent: createMockFn(),
          }
          return list
        }
      ),
    })
  }

  // visualViewport Mock
  if (
    typeof window !== 'undefined' &&
    typeof window.visualViewport === 'undefined'
  ) {
    Object.defineProperty(window, 'visualViewport', {
      writable: true,
      configurable: true,
      value: {
        addEventListener: createMockFn(),
        removeEventListener: createMockFn(),
        width: 1024,
        height: 768,
        offsetLeft: 0,
        offsetTop: 0,
        pageLeft: 0,
        pageTop: 0,
        scale: 1,
        onresize: null,
        onscroll: null,
      },
    })
  }

  // Clipboard API Mock
  // Ensure navigator exists (sometimes missing in JSDOM depending on version/config)
  if (typeof global.navigator === 'undefined') {
    // @ts-expect-error navigator not defined in test environment
    global.navigator = {}
  }

  if (typeof global.navigator.clipboard === 'undefined') {
    const mockClipboard = {
      writeText: createMockFn().mockResolvedValue(undefined),
      readText: createMockFn().mockResolvedValue(''),
      write: createMockFn().mockResolvedValue(undefined),
      read: createMockFn().mockResolvedValue([]),
      addEventListener: createMockFn(),
      removeEventListener: createMockFn(),
      dispatchEvent: createMockFn(),
    }
    Object.defineProperty(global.navigator, 'clipboard', {
      writable: true,
      configurable: true,
      value: mockClipboard,
    })
  }

  // HTMLCanvasElement Mocks
  if (typeof HTMLCanvasElement !== 'undefined') {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      writable: true,
      configurable: true,
      value: createMockFn<[string], unknown>().mockImplementation(
        (contextType) => {
          if (contextType === '2d') {
            return {
              fillStyle: '',
              fillRect: createMockFn(),
              getImageData: createMockFn().mockReturnValue({
                data: new Uint8ClampedArray(4),
              }),
              putImageData: createMockFn(),
              createImageData: createMockFn().mockReturnValue({
                data: new Uint8ClampedArray(4),
              }),
              setTransform: createMockFn(),
              drawImage: createMockFn(),
              save: createMockFn(),
              fillText: createMockFn(),
              restore: createMockFn(),
              beginPath: createMockFn(),
              moveTo: createMockFn(),
              lineTo: createMockFn(),
              closePath: createMockFn(),
              stroke: createMockFn(),
              translate: createMockFn(),
              scale: createMockFn(),
              rotate: createMockFn(),
              arc: createMockFn(),
              fill: createMockFn(),
              measureText: createMockFn().mockReturnValue({ width: 0 }),
              transform: createMockFn(),
              rect: createMockFn(),
              clip: createMockFn(),
              createLinearGradient: createMockFn().mockReturnValue({
                addColorStop: createMockFn(),
              }),
            }
          }
          return null
        }
      ),
    })

    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
      writable: true,
      configurable: true,
      value: createMockFn().mockReturnValue(
        'data:image/png;base64,mockDataURL'
      ),
    })
  }

  // IntersectionObserver Mock
  if (typeof global.IntersectionObserver === 'undefined') {
    class MockIntersectionObserver {
      observe = createMockFn()
      unobserve = createMockFn()
      disconnect = createMockFn()
      takeRecords = createMockFn().mockReturnValue([])
      constructor(
        _callback: IntersectionObserverCallback,
        _options?: IntersectionObserverInit
      ) {}
    }
    Object.defineProperty(global, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    })
  }

  // Scroll methods
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'scrollTo', {
      writable: true,
      configurable: true,
      value: createMockFn(),
    })
    Object.defineProperty(window, 'scroll', {
      writable: true,
      configurable: true,
      value: createMockFn(),
    })
    if (typeof HTMLElement !== 'undefined') {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
        writable: true,
        configurable: true,
        value: createMockFn(),
      })
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
        writable: true,
        configurable: true,
        value: createMockFn(),
      })
    }
  }
}
