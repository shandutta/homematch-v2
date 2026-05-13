import Link from 'next/link'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'

/**
 * Lightweight header for light-themed marketing pages (/about, /contact, etc.).
 *
 * Distinct from the homepage <Header /> because that component is dark-themed
 * and scroll-aware, which doesn't fit the slate-50 secondary pages and left
 * those pages with no nav at all (QA ISSUE-009 — no way back to homepage).
 */
export function MarketingPageHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5"
        aria-label="Site"
      >
        <Link
          href="/"
          className="group inline-flex items-center rounded-xl px-2 py-1 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
          aria-label="HomeMatch - Go to homepage"
        >
          <HomeMatchLogo size="sm" textClassName="text-slate-900" />
        </Link>

        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 ring-1 ring-slate-200">
          <Link
            href="/login"
            className="inline-flex min-h-[40px] items-center rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 sm:text-base"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-[40px] items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:text-base"
          >
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  )
}
