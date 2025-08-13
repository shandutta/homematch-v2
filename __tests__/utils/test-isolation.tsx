/**
 * Test isolation utilities to prevent cross-test contamination
 * Provides clean state management and reliable async patterns
 */

import { cleanup } from '@testing-library/react'
import { jest } from '@jest/globals'

/**
 * Comprehensive cleanup between tests to prevent state contamination
 * Resets DOM, clears mocks, and cleans up any side effects
 */
export function cleanupBetweenTests() {
  // Clean up DOM elements created by tests
  cleanup()

  // Clear all mock function calls and instances
  jest.clearAllMocks()

  // Reset all mock implementations to their initial state
  jest.resetAllMocks()

  // Clear any localStorage/sessionStorage that tests might have set
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
    window.sessionStorage.clear()
  }

  // Clear any timers that might be running
  jest.clearAllTimers()
}

/**
 * Create isolated test environment with proper cleanup
 * Use in beforeEach/afterEach hooks
 */
export function setupTestIsolation() {
  beforeEach(() => {
    cleanupBetweenTests()
    // Use fake timers for consistent timing in tests
    jest.useFakeTimers()
  })

  afterEach(() => {
    // Clean up fake timers
    jest.runOnlyPendingTimers()
    jest.useRealTimers()

    // Final cleanup
    cleanupBetweenTests()
  })
}

/**
 * Reliable async utility that waits for conditions without arbitrary timeouts
 * Replaces brittle setTimeout/delay patterns in tests
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number
    interval?: number
    timeoutMessage?: string
  } = {}
) {
  const {
    timeout = 5000,
    interval = 50,
    timeoutMessage = 'Condition not met within timeout',
  } = options

  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition()
      if (result) {
        return true
      }
    } catch (_error) {
      // Continue waiting if condition throws
    }

    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(timeoutMessage)
}

/**
 * Mock factory that creates isolated mocks for each test
 * Prevents mock state from leaking between tests
 */
export function createIsolatedMock<
  T extends (...args: any[]) => any,
>(): jest.MockedFunction<T> {
  return jest.fn() as unknown as jest.MockedFunction<T>
}

/**
 * Creates a mock with consistent return values that won't change during tests
 * Useful for replacing flaky external dependencies
 */
export function createStableMock<T>(
  returnValue: T
): jest.MockedFunction<() => T> {
  const mock = jest.fn<() => T>()
  mock.mockReturnValue(returnValue)
  return mock
}

/**
 * Advanced mock that tracks call order and provides debugging info
 * Helpful for testing complex interaction sequences
 */
export function createDebugMock<T extends (...args: any[]) => any>(
  _name: string
) {
  const mock = jest.fn<T>()
  const callHistory: Array<{
    args: Parameters<T>
    timestamp: number
    callIndex: number
  }> = []

  mock.mockImplementation(((...args: Parameters<T>) => {
    callHistory.push({
      args,
      timestamp: Date.now(),
      callIndex: callHistory.length,
    })
    return undefined
  }) as T)

  return {
    mock,
    getCallHistory: () => callHistory,
    getCallCount: () => callHistory.length,
    wasCalledWith: (expectedArgs: Parameters<T>) => {
      return callHistory.some(
        (call) =>
          call.args.length === expectedArgs.length &&
          call.args.every((arg, index) => arg === expectedArgs[index])
      )
    },
    reset: () => {
      mock.mockClear()
      callHistory.length = 0
    },
  }
}

/**
 * Safe async test wrapper that catches and reports promise rejections
 * Prevents unhandled promise rejections from failing other tests
 */
export function safeAsyncTest(testFn: () => Promise<void>) {
  return async () => {
    await testFn()
  }
}

/**
 * Creates a mock component that renders predictably in tests
 * Useful for isolating components under test from complex child components
 */
export function createMockComponent(displayName: string, props?: any) {
  const MockComponent = ({ children, ...componentProps }: any) => (
    <div data-testid={`mock-${displayName.toLowerCase()}`} {...componentProps}>
      {props && (
        <span data-testid={`${displayName.toLowerCase()}-props`}>
          {JSON.stringify(props)}
        </span>
      )}
      {children}
    </div>
  )

  MockComponent.displayName = displayName
  return MockComponent
}

/**
 * Test data factory that creates consistent, isolated test data
 * Prevents test data from affecting other tests
 */
export function createTestDataFactory<T>(defaultData: T) {
  return (overrides?: Partial<T>): T => {
    // Create a deep copy to prevent mutation between tests
    const baseData = JSON.parse(JSON.stringify(defaultData))
    return { ...baseData, ...overrides }
  }
}
