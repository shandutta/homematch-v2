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
        <main className="flex min-h-screen items-center justify-center bg-[#030712] text-white">
          <div className="max-w-lg px-6 text-center">
            <div className="mb-6 flex justify-center">
              <HomeMatchLogo size="lg" />
            </div>
            <h1 className="mb-3 text-5xl font-black text-white/10 sm:text-7xl">
              Error
            </h1>
            <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
              Something went wrong
            </h2>
            <p className="mb-4 text-base text-slate-400 sm:text-lg">
              A critical error occurred. Please try again, or reload the page if
              the issue persists.
            </p>
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition-all duration-200 hover:bg-white/20 hover:ring-white/30"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
