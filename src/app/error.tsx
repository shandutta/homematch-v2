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
    <main className="flex min-h-screen items-center justify-center bg-hm-canvas text-hm-ink">
      <div className="max-w-lg px-6 text-center">
        <div className="mb-6 flex justify-center">
          <HomeMatchLogo size="lg" />
        </div>
        <h1 className="mb-3 text-5xl font-black text-hm-faint/30 sm:text-7xl">
          Error
        </h1>
        <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Something went wrong
        </h2>
        <p className="mb-4 text-base text-hm-muted sm:text-lg">
          An unexpected error occurred. Please try again, or refresh the page if
          the problem persists.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-full bg-hm-accent/10 px-6 py-3 text-sm font-semibold text-hm-accent-strong ring-1 ring-hm-accent/20 transition-all duration-200 hover:bg-hm-accent/20 hover:ring-hm-accent/30"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-full border border-hm-border px-6 py-3 text-sm font-medium text-hm-muted transition-all duration-200 hover:border-hm-border-strong hover:text-hm-ink"
          >
            Refresh page
          </button>
        </div>
      </div>
    </main>
  )
}
