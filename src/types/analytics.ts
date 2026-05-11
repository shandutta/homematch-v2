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

export interface WindowWithAnalytics {
  gtag?: GtagFunction
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
