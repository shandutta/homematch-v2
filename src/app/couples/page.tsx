'use client'

import { useState } from 'react'
import { Header } from '@/components/layouts/Header'
import { Footer } from '@/components/layouts/Footer'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/query/config'
import { CouplesPageClient } from '@/components/couples/CouplesPageClient'
import { CouplesErrorBoundary } from '@/components/couples/CouplesErrorBoundary'
import { Toaster } from '@/components/ui/sonner'

export default function CouplesPage() {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <div className="gradient-grid-bg flex min-h-screen flex-col text-white">
      <Header />
      <main className="container mx-auto flex-grow px-4 py-8">
        <QueryClientProvider client={queryClient}>
          <CouplesErrorBoundary>
            <CouplesPageClient />
          </CouplesErrorBoundary>
        </QueryClientProvider>
        <Toaster position="top-right" />
      </main>
      <Footer />
    </div>
  )
}
