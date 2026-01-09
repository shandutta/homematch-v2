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
  count(): Promise<number>
  first(): PlaywrightLocator
  locator(selector: string): PlaywrightLocator
  waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden'
    timeout?: number
  }): Promise<void>
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

export interface PlaywrightRoute {
  continue(): Promise<void>
  fulfill(options: {
    status: number
    contentType?: string
    body?: string
  }): Promise<void>
  abort(): Promise<void>
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
    browser(): {
      browserType(): {
        name(): string
      }
    } | null
  }

  // Script evaluation
  evaluate<T = unknown>(pageFunction: string, arg?: unknown): Promise<T>
  evaluate<T = unknown, Arg = unknown>(
    pageFunction: (arg: Arg) => T | Promise<T>,
    arg?: Arg
  ): Promise<T>

  // Waiting and timeouts
  waitForLoadState(
    state?: 'load' | 'domcontentloaded' | 'networkidle',
    options?: { timeout?: number }
  ): Promise<void>
  waitForTimeout(timeout: number): Promise<void>
  waitForURL(
    url: string | RegExp | ((url: URL) => boolean),
    options?: { timeout?: number }
  ): Promise<void>
  waitForSelector(
    selector: string,
    options?: {
      timeout?: number
      state?: 'attached' | 'detached' | 'visible' | 'hidden'
    }
  ): Promise<PlaywrightLocator | null>
  waitForFunction(
    pageFunction: string | ((...args: unknown[]) => unknown),
    arg?: unknown,
    options?: { timeout?: number }
  ): Promise<unknown>

  // Element locators (basic interface)
  locator(selector: string): PlaywrightLocator
  getByRole(
    role: string,
    options?: { name?: string | RegExp }
  ): PlaywrightLocator

  // Navigation
  goto(
    url: string,
    options?: {
      waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'
      timeout?: number
    }
  ): Promise<PlaywrightResponse | null>

  // Network routing
  route(
    url: string | RegExp,
    handler: (route: PlaywrightRoute) => Promise<void> | void
  ): Promise<void>
  unroute(url: string | RegExp): Promise<void>
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
  config: Record<string, unknown>
  timeout: number
  status?: string
  duration?: number
  errors?: Array<{ message?: string; value?: unknown; stack?: string }>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Type guard to ensure objects have the methods we need
 */
export function isPlaywrightPage(obj: unknown): obj is PlaywrightPage {
  if (!isRecord(obj)) return false
  return (
    typeof obj.on === 'function' &&
    typeof obj.url === 'function' &&
    typeof obj.title === 'function' &&
    typeof obj.screenshot === 'function'
  )
}

export function isPlaywrightTestInfo(obj: unknown): obj is PlaywrightTestInfo {
  if (!isRecord(obj)) return false
  return typeof obj.title === 'string' && typeof obj.testId === 'string'
}
