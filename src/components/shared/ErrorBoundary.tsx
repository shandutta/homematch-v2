'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
          <h2 className="mb-4 text-2xl font-semibold">Something went wrong</h2>
          <p className="mb-6 text-gray-600">
            We encountered an unexpected error.
          </p>
          <Button
            onClick={() => this.setState({ hasError: false })}
            variant="default"
          >
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
