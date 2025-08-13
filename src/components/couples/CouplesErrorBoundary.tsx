'use client'

import { Component, ReactNode, ErrorInfo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, RefreshCw, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: string
}

export class CouplesErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: error.message || 'An unexpected error occurred',
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Couples error boundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[400px] items-center justify-center"
        >
          <Card className="card-glassmorphism-style max-w-md border-red-500/20">
            <CardContent className="p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mb-4"
              >
                <div className="relative mx-auto h-16 w-16">
                  <Heart className="absolute h-16 w-16 text-red-400/30" />
                  <AlertTriangle className="absolute top-1/2 left-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-red-400" />
                </div>
              </motion.div>

              <h2 className="text-primary-foreground mb-2 text-xl font-semibold">
                Something went wrong
              </h2>

              <p className="text-primary/60 mb-4 text-sm">
                We couldn&apos;t load your couples data. This usually happens
                due to a temporary connection issue.
              </p>

              {process.env.NODE_ENV === 'development' &&
                this.state.errorInfo && (
                  <details className="mb-4 text-left">
                    <summary className="mb-2 cursor-pointer text-xs text-red-400">
                      Error details (dev only)
                    </summary>
                    <pre className="max-h-32 overflow-auto rounded bg-red-900/20 p-2 text-xs text-red-300/80">
                      {this.state.errorInfo}
                    </pre>
                  </details>
                )}

              <div className="flex justify-center gap-2">
                <Button
                  onClick={this.handleRetry}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  size="sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>

                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/dashboard')}
                  size="sm"
                  className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )
    }

    return this.props.children
  }
}
