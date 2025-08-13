/// <reference types="@testing-library/jest-dom" />

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * @deprecated Use `toBeInTheDocument` instead.
       */
      toBeInTheDocument(): R
      toHaveClass(expected: string): R
      toHaveAttribute(attr: string, value?: string | number | boolean): R
      toHaveTextContent(expected: string | RegExp): R
      toHaveValue(expected: string | number | string[]): R
      toBeVisible(): R
      toBeDisabled(): R
      toBeEnabled(): R
      toBeChecked(): R
      toHaveFocus(): R
      toBeEmptyDOMElement(): R
    }
  }
}
