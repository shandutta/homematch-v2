/**
 * Minimal interface definitions for Playwright types
 * Avoids circular dependency while maintaining type safety
 */

export interface PlaywrightLocator {
  fill(value: string): Promise<void>
  click(): Promise<void>
  isVisible(): Promise<boolean>
  isEnabled(): Promise<boolean>
  textContent(): Promise<string | null>
  first(): PlaywrightLocator
}

export interface PlaywrightRequest {
  method(): string
  url(): string
  headers(): Record<string, string>
  postData(): string | null
  timing(): { responseEnd?: number } | null
  failure(): { errorText: string } | null
}

export interface PlaywrightResponse {
  url(): string
  status(): number
  headers(): Record<string, string>
  request(): PlaywrightRequest
}

export interface PlaywrightPage {
  // Event handling
  on(event: 'console', handler: (msg: ConsoleMessage) => void): void
  on(event: 'request', handler: (request: PlaywrightRequest) => void): void
  on(
    event: 'requestfailed',
    handler: (request: PlaywrightRequest) => void
  ): void
  on(event: 'response', handler: (response: PlaywrightResponse) => void): void
  on(event: 'pageerror', handler: (error: Error) => void): void
  on(event: 'load', handler: () => void): void
  on(event: 'crash', handler: () => void): void
  on(event: string, handler: (...args: unknown[]) => void): void

  // Navigation and info
  url(): string
  title(): Promise<string>

  // Screenshots
  screenshot(options?: {
    path?: string
    fullPage?: boolean
    type?: 'png' | 'jpeg'
  }): Promise<Buffer>

  // Browser context
  context(): {
    clearCookies(): Promise<void>
  }

  // Script evaluation
  evaluate<T = unknown>(
    pageFunction: string | ((...args: unknown[]) => unknown),
    arg?: unknown
  ): Promise<T>

  // Waiting and timeouts
  waitForLoadState(
    state?: 'load' | 'domcontentloaded' | 'networkidle'
  ): Promise<void>
  waitForTimeout(timeout: number): Promise<void>
  waitForURL(
    url: string | RegExp,
    options?: { timeout?: number }
  ): Promise<void>

  // Element locators (basic interface)
  locator(selector: string): PlaywrightLocator

  // Navigation
  goto(
    url: string,
    options?: {
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'
      timeout?: number
    }
  ): Promise<any>
}

export interface ConsoleMessage {
  type():
    | 'log'
    | 'debug'
    | 'info'
    | 'error'
    | 'warning'
    | 'dir'
    | 'dirxml'
    | 'table'
    | 'trace'
    | 'clear'
    | 'startGroup'
    | 'startGroupCollapsed'
    | 'endGroup'
    | 'assert'
    | 'profile'
    | 'profileEnd'
    | 'count'
    | 'timeEnd'
  text(): string
  location(): {
    url?: string
    lineNumber?: number
    columnNumber?: number
  }
}

export interface PlaywrightTestInfo {
  title: string
  testId: string
  workerIndex: number
  parallelIndex: number
  project: {
    name: string
    testDir: string
  }
  config: any
  timeout: number
}

/**
 * Type guard to ensure objects have the methods we need
 */
export function isPlaywrightPage(obj: unknown): obj is PlaywrightPage {
  const o = obj as Record<string, unknown>
  return (
    !!o &&
    typeof o.on === 'function' &&
    typeof o.url === 'function' &&
    typeof o.title === 'function' &&
    typeof o.screenshot === 'function'
  )
}

export function isPlaywrightTestInfo(obj: unknown): obj is PlaywrightTestInfo {
  const o = obj as Record<string, unknown>
  return !!o && typeof o.title === 'string' && typeof o.testId === 'string'
}
