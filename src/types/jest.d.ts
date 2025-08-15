import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveClass(expected: string): R
      toHaveAttribute(attr: string, value?: string | number | boolean): R
    }
  }
}

// Mock fetch return types for tests
export interface MockSupabaseResponse<T = unknown> {
  data: T
  error: null
}

export interface MockSupabaseError {
  data: null
  error: Error
}
