'use client'

import { ReactNode, useState } from 'react'
import { Header } from '@/components/layouts/Header'
import { Footer } from '@/components/layouts/Footer'
import { QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { createQueryClient } from '@/lib/query/config'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <div className="gradient-grid-bg min-h-screen flex flex-col text-white">
      <Header />
      <main className="flex-grow container mx-auto py-8 px-4">
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </QueryClientProvider>
      </main>
      <Footer />
    </div>
  )
}
