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
              A critical error occurred. Please try again, or reload the page if
              the issue persists.
            </p>
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-full bg-hm-accent/10 px-6 py-3 text-sm font-semibold text-hm-accent-strong ring-1 ring-hm-accent/20 transition-all duration-200 hover:bg-hm-accent/20 hover:ring-hm-accent/30"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
