'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, RefreshCw, RotateCcw, Wifi, WifiOff } from 'lucide-react'
import type { WindowWithAnalytics, SentryScope } from '@/types/analytics'

interface Props {
  children: ReactNode
  operation?: string
  fallback?: ReactNode
  onRetry?: () => Promise<void>
}

interface State {
  hasError: boolean
  error: Error | null
  isRetrying: boolean
  retryCount: number
  isOnline: boolean
}

export class AsyncErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null
  private autoRetryCount = 0
  private maxAutoRetries = 2

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: 0,
      isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    }
  }

  componentDidMount() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
    }
  }

  handleOnline = () => {
    this.setState({ isOnline: true })
    // Auto-retry on network restoration
    if (this.state.hasError && this.isNetworkError()) {
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry()
      }, 1000)
    }
  }

  handleOffline = () => {
    this.setState({ isOnline: false })
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Async error boundary caught:`, error, errorInfo)

    const errorType = this.categorizeError(error)

    // Report to analytics if available
    const analyticsWindow = window as unknown as WindowWithAnalytics
    if (typeof window !== 'undefined' && analyticsWindow.gtag) {
      analyticsWindow.gtag('event', 'exception', {
        event_category: 'async_error',
        event_label: errorType,
        custom_parameters: {
          description: `Async error in ${this.props.operation || 'unknown'}: ${error.message}`,
          error_type: errorType,
          is_online: this.state.isOnline,
          retry_count: this.state.retryCount,
          fatal: false,
        },
      })
    }

    // Report to Sentry if available
    if (typeof window !== 'undefined' && analyticsWindow.Sentry) {
      analyticsWindow.Sentry.withScope((scope: SentryScope) => {
        scope.setTag('error_boundary', 'async')
        scope.setContext('async_operation', {
          operation: this.props.operation,
          errorType,
          isOnline: this.state.isOnline,
          retryCount: this.state.retryCount,
        })
        analyticsWindow.Sentry!.captureException(error)
      })
    }

    // Auto-retry for certain error types only if we haven't exceeded the limit
    if (
      this.shouldAutoRetry(error) &&
      this.state.retryCount < this.maxAutoRetries
    ) {
      this.scheduleAutoRetry()
    }
  }

  categorizeError(error: Error): string {
    const message = error.message.toLowerCase()

    if (message.includes('network') || message.includes('fetch')) {
      return 'network'
    }
    if (message.includes('timeout')) {
      return 'timeout'
    }
    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('unauthorized')
    ) {
      return 'auth'
    }
    if (message.includes('404') || message.includes('not found')) {
      return 'not_found'
    }
    if (message.includes('500') || message.includes('server')) {
      return 'server'
    }
    return 'unknown'
  }

  isNetworkError(): boolean {
    return this.categorizeError(this.state.error!) === 'network'
  }

  shouldAutoRetry(error: Error): boolean {
    const errorType = this.categorizeError(error)
    return (
      this.autoRetryCount < this.maxAutoRetries &&
      (errorType === 'network' ||
        errorType === 'timeout' ||
        errorType === 'server')
    )
  }

  scheduleAutoRetry() {
    // Prevent excessive auto-retries
    if (this.autoRetryCount >= this.maxAutoRetries) {
      return
    }

    const backoffTime = Math.min(1000 * Math.pow(2, this.autoRetryCount), 5000)
    this.autoRetryCount++ // Increment before scheduling
    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry()
    }, backoffTime)
  }

  handleRetry = async () => {
    this.setState((prevState) => ({
      isRetrying: true,
      retryCount: prevState.retryCount + 1,
    }))

    try {
      if (this.props.onRetry) {
        await this.props.onRetry()
      }

      // Reset error state after successful retry
      this.setState({
        hasError: false,
        error: null,
        isRetrying: false,
      })
      this.autoRetryCount = 0
    } catch (error) {
      // Update with new error
      this.setState({
        error: error as Error,
        isRetrying: false,
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: 0,
    })
    this.autoRetryCount = 0
  }

  handleRefreshPage = () => {
    window.location.reload()
  }

  getErrorMessage(): string {
    const errorType = this.categorizeError(this.state.error!)

    switch (errorType) {
      case 'network':
        return 'Network connection issue. Please check your internet connection and try again.'
      case 'timeout':
        return 'The operation timed out. Please try again.'
      case 'auth':
        return 'Authentication failed. Please sign in again.'
      case 'not_found':
        return 'The requested resource was not found.'
      case 'server':
        return 'Server error. Please try again later.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, isRetrying, retryCount, isOnline } = this.state
      const maxRetries = 5
      const operationName = this.props.operation || 'Operation'

      return (
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="text-destructive h-5 w-5" />
                {operationName} Failed
              </span>
              <Badge variant={isOnline ? 'default' : 'secondary'}>
                {isOnline ? (
                  <>
                    <Wifi className="mr-1 h-3 w-3" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="mr-1 h-3 w-3" />
                    Offline
                  </>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {this.getErrorMessage()}
            </p>

            {retryCount > 0 && retryCount < maxRetries && (
              <Badge variant="outline">
                Retry {retryCount}/{maxRetries}
              </Badge>
            )}

            {retryCount >= maxRetries && (
              <p className="text-destructive text-sm font-medium">
                Maximum retries reached
              </p>
            )}

            {process.env.NODE_ENV === 'development' && (
              <details className="text-xs">
                <summary className="cursor-pointer font-medium">
                  Error Details (dev only)
                </summary>
                <pre className="bg-muted mt-2 overflow-auto rounded p-2">
                  {error?.stack || error?.message}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              {retryCount < maxRetries && (
                <Button
                  onClick={this.handleRetry}
                  disabled={isRetrying || !isOnline}
                  variant="default"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`}
                  />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              )}

              {!isOnline && (
                <Button
                  onClick={this.handleRefreshPage}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Page
                </Button>
              )}

              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
