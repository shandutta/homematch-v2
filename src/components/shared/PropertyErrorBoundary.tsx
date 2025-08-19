'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react'
import type { WindowWithAnalytics, SentryScope } from '@/types/analytics'

interface Props {
  children: ReactNode
  propertyId?: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  retryCount: number
}

export class PropertyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Property error boundary caught:', error, errorInfo)

    // Report to analytics if available
    const analyticsWindow = window as unknown as WindowWithAnalytics
    if (typeof window !== 'undefined' && analyticsWindow.gtag) {
      analyticsWindow.gtag('event', 'exception', {
        event_category: 'property_error',
        event_label: this.props.propertyId || 'unknown',
        custom_parameters: {
          description: `Property error: ${error.message}`,
          property_id: this.props.propertyId || 'unknown',
          retry_count: this.state.retryCount,
          fatal: false,
        },
      })
    }

    // Report to Sentry if available
    if (typeof window !== 'undefined' && analyticsWindow.Sentry) {
      analyticsWindow.Sentry.withScope((scope: SentryScope) => {
        scope.setTag('error_boundary', 'property')
        scope.setContext('property', {
          propertyId: this.props.propertyId,
          retryCount: this.state.retryCount,
        })
        analyticsWindow.Sentry!.captureException(error)
      })
    }
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1,
    }))
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, retryCount } = this.state
      const isNetworkError = error?.message?.toLowerCase().includes('network')
      const maxRetries = 3

      return (
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="text-destructive h-5 w-5" />
              Property Load Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {isNetworkError
                ? 'Connection issue loading this property. Please check your internet connection and try again.'
                : 'Unable to load property details. Please try again.'}
            </p>

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

            {retryCount >= maxRetries && (
              <p className="text-destructive text-sm font-medium">
                Maximum retries reached
              </p>
            )}

            <div className="flex gap-2">
              {retryCount < maxRetries && (
                <Button
                  onClick={this.handleRetry}
                  variant="default"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry{' '}
                  {maxRetries - retryCount > 0 &&
                    `(${maxRetries - retryCount} left)`}
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
