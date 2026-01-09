'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard error:', error, errorInfo)

    // Log to analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        event_category: 'dashboard_error',
        custom_parameters: {
          description: error.message,
          fatal: false,
        },
      })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error
      const isDatabaseError =
        error?.message.includes('DATABASE_CONNECTION_ERROR') ||
        error?.message.toLowerCase().includes('database') ||
        error?.message.toLowerCase().includes('connection') ||
        error?.message.toLowerCase().includes('server error')

      return (
        this.props.fallback || (
          <div className="container mx-auto px-4 py-8">
            <Card className="mx-auto max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="text-destructive h-5 w-5" />
                  {isDatabaseError
                    ? 'Database Connection Error'
                    : 'Something went wrong'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {isDatabaseError
                    ? 'We are experiencing database connection issues. Please try again in a few moments.'
                    : 'We encountered an error while loading your dashboard. Please try refreshing the page.'}
                </p>
                <div className="flex gap-2">
                  <Button onClick={this.handleReset} variant="default">
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                  >
                    Refresh Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )
    }

    return this.props.children
  }
}
