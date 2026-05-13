/**
 * TypeScript interfaces for analytics and error tracking
 * Replaces all 'any' types with proper type definitions
 */

interface GtagEvent {
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

interface _WindowWithAnalytics {
  gtag?: GtagFunction
  __REACT_HYDRATION_TIME__?: number
}

interface _ErrorReportData {
  formName?: string
  error?: string
  userAgent?: string
  timestamp: string
  componentStack?: string
  stack?: string
}

interface _PerformanceReportData {
  metrics: Array<{
    name: string
    value: number
    rating: 'good' | 'needs-improvement' | 'poor'
  }>
  url: string
  userAgent: string
  timestamp: number
}
