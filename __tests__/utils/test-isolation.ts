/**
 * Test isolation utilities for ensuring clean test environments
 * Provides proper cleanup and isolation between tests
 */
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

export function setupTestIsolation() {
  // Clean up DOM between tests
  afterEach(() => {
    cleanup()
  })

  // Clear mock call history before each test (but don't restore global mocks)
  beforeEach(() => {
    vi.clearAllMocks()
    // Note: vi.restoreAllMocks() removed - it undoes global mocks from vitest.setup.ts
  })

  // Clear timers after tests
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  // Reset any global state that might interfere with tests
  beforeEach(() => {
    // Clear any localStorage/sessionStorage
    if (typeof Storage !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }

    // Reset any global variables
    delete (global as any).mockUserAgent
  })
}

/**
 * Utility for tests that need to wait for async operations
 */
export async function waitForAsync(ms: number = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mock user agent for testing responsive behavior
 */
export function mockUserAgent(userAgent: string) {
  Object.defineProperty(global.navigator, 'userAgent', {
    value: userAgent,
    writable: true,
    configurable: true,
  })
}

/**
 * Create a test environment with proper isolation
 */
export function createTestEnvironment() {
  return {
    cleanup: () => {
      cleanup()
      vi.clearAllMocks()
      vi.clearAllTimers()
    },
    waitFor: waitForAsync,
    mockUserAgent,
  }
}
