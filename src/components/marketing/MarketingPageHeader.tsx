import Link from 'next/link'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'

/**
 * Lightweight warm header for the public marketing and legal pages
 * (/about, /contact, /privacy, /terms, /cookies).
 *
 * Distinct from the homepage <Header />, which is a scroll-aware hero
 * overlay. This one is a static, warm-surface bar so the secondary pages
 * always have a way back to the homepage (QA ISSUE-009).
 */
export function MarketingPageHeader() {
  return (
    <header className="border-hm-border bg-hm-surface border-b">
      <nav
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5"
        aria-label="Site"
      >
        <Link
          href="/"
          className="group focus-visible:ring-hm-focus/50 inline-flex items-center rounded-xl px-2 py-1 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
          aria-label="HomeMatch - Go to homepage"
        >
          <HomeMatchLogo size="sm" textClassName="text-hm-ink" />
        </Link>

        <div className="bg-hm-canvas ring-hm-border flex items-center gap-1 rounded-full p-1 ring-1">
          <Link
            href="/login"
            className="text-hm-muted hover:bg-hm-surface-raised hover:text-hm-ink inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-sm font-medium transition-colors sm:text-base"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="bg-hm-ink text-hm-surface hover:bg-hm-ink-soft inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-sm font-medium transition-colors sm:text-base"
          >
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  )
}
