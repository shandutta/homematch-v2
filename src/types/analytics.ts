/**
 * TypeScript interfaces for analytics and error tracking
 * Replaces all 'any' types with proper type definitions
 */

export interface GtagEvent {
  event_category?: string
  event_label?: string
  value?: number
  custom_parameters?: Record<string, unknown>
}

export interface GtagFunction {
  (command: 'event', action: string, parameters?: GtagEvent): void
  (command: 'config', targetId: string, config?: Record<string, unknown>): void
  (command: string, ...params: unknown[]): void
}

export interface SentryScope {
  setTag(key: string, value: string): void
  setContext(key: string, context: Record<string, unknown>): void
  setLevel(level: 'fatal' | 'error' | 'warning' | 'info' | 'debug'): void
  setUser(user: Record<string, unknown>): void
  setExtra(key: string, extra: unknown): void
}

export interface SentryHub {
  captureException(exception: Error): string
  captureMessage(message: string): string
  withScope(callback: (scope: SentryScope) => void): void
}

export interface PostHogFunction {
  capture(event: string, properties?: Record<string, unknown>): void
  identify(distinctId: string, properties?: Record<string, unknown>): void
  alias(alias: string, distinctId?: string): void
  reset(): void
}

export interface WindowWithAnalytics {
  gtag?: GtagFunction
  Sentry?: SentryHub
  posthog?: PostHogFunction
  __REACT_HYDRATION_TIME__?: number
}

export interface ErrorReportData {
  formName?: string
  error?: string
  userAgent?: string
  timestamp: string
  componentStack?: string
  stack?: string
}

export interface PerformanceReportData {
  metrics: Array<{
    name: string
    value: number
    rating: 'good' | 'needs-improvement' | 'poor'
  }>
  url: string
  userAgent: string
  timestamp: number
}
