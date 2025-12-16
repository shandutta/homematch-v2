'use client'

import { useState } from 'react'
import { Header } from '@/components/layouts/Header'
import { Footer } from '@/components/layouts/Footer'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/query/config'
import { CouplesPageClient } from '@/components/couples/CouplesPageClient'
import { CouplesErrorBoundary } from '@/components/couples/CouplesErrorBoundary'

export default function CouplesPage() {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <div className="gradient-grid-bg flex min-h-screen flex-col text-white">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-grow px-4 py-8 sm:px-6">
        <QueryClientProvider client={queryClient}>
          <CouplesErrorBoundary>
            <CouplesPageClient />
          </CouplesErrorBoundary>
        </QueryClientProvider>
      </main>
      <Footer />
    </div>
  )
}
