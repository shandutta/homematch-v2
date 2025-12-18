'use client'

import { ReactNode, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Header } from '@/components/layouts/Header'
import { Footer } from '@/components/layouts/Footer'
import { MobileBottomNav } from '@/components/layouts/MobileBottomNav'
import { CouplesErrorBoundary } from '@/components/couples/CouplesErrorBoundary'
import { createQueryClient } from '@/lib/query/config'

interface CouplesLayoutProps {
  children: ReactNode
}

export default function CouplesLayout({ children }: CouplesLayoutProps) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <div className="gradient-grid-bg dark text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-grow px-4 py-8 sm:px-6">
        <QueryClientProvider client={queryClient}>
          <CouplesErrorBoundary>{children}</CouplesErrorBoundary>
        </QueryClientProvider>
      </main>
      <Footer variant="minimal" />
      <div className="bottom-nav-spacer md:hidden" aria-hidden="true" />
      <MobileBottomNav />
    </div>
  )
}
