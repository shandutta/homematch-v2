'use client'

import { ReactNode, useState } from 'react'
import { Header } from '@/components/layouts/Header'
import { Footer } from '@/components/layouts/Footer'
import { QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { createQueryClient } from '@/lib/query/config'
import { PropertyDetailProvider } from '@/components/property/PropertyDetailProvider'
import { usePathname } from 'next/navigation'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [queryClient] = useState(() => createQueryClient())
  const pathname = usePathname()
  const footerVariant = pathname === '/dashboard' ? 'cta' : 'minimal'

  return (
    <div className="gradient-grid-bg flex min-h-screen flex-col text-white">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-grow px-4 py-8 sm:px-6">
        <QueryClientProvider client={queryClient}>
          <PropertyDetailProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </PropertyDetailProvider>
        </QueryClientProvider>
      </main>
      <Footer variant={footerVariant} />
    </div>
  )
}
