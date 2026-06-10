'use client'

import { HomeMatchLogo } from '@/components/shared/home-match-logo'

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
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
              A critical error occurred. Please try again, or reload the page if
              the issue persists.
            </p>
            <button
              onClick={() => reset()}
              className="bg-hm-accent/10 text-hm-accent-strong ring-hm-accent/20 hover:bg-hm-accent/20 hover:ring-hm-accent/30 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold ring-1 transition-all duration-200"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
