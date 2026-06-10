'use client'

import { HomeMatchLogo } from '@/components/shared/home-match-logo'

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="bg-hm-canvas text-hm-ink flex min-h-screen items-center justify-center">
      <div className="max-w-lg px-6 text-center">
        <div className="mb-6 flex justify-center">
          <HomeMatchLogo size="lg" />
        </div>
        <h1 className="text-hm-faint/30 mb-3 text-5xl font-black sm:text-7xl">
          Error
        </h1>
        <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Something went wrong
        </h2>
        <p className="text-hm-muted mb-4 text-base sm:text-lg">
          An unexpected error occurred. Please try again, or refresh the page if
          the problem persists.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="bg-hm-accent/10 text-hm-accent-strong ring-hm-accent/20 hover:bg-hm-accent/20 hover:ring-hm-accent/30 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold ring-1 transition-all duration-200"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="border-hm-border text-hm-muted hover:border-hm-border-strong hover:text-hm-ink inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-medium transition-all duration-200"
          >
            Refresh page
          </button>
        </div>
      </div>
    </main>
  )
}
