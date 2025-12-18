'use client'

import { ReactNode, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { createQueryClient } from '@/lib/query/config'

interface PropertiesLayoutProps {
  children: ReactNode
}

export default function PropertiesLayout({ children }: PropertiesLayoutProps) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <div className="gradient-grid-bg dark text-foreground min-h-screen">
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </QueryClientProvider>
    </div>
  )
}
