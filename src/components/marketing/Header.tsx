import Link from 'next/link'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'

export function Header() {
  return (
    <header className="absolute top-0 z-50 w-full">
      {/* Align header content with hero container and text column */}
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/"
          className="rounded-xl px-3 py-2 text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
          style={{ fontFamily: 'var(--font-heading)' }}
          aria-label="HomeMatch - Go to homepage"
        >
          <HomeMatchLogo size="sm" textClassName="text-white" />
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/login"
            className="text-sm text-white/80 transition-colors hover:text-white sm:text-base"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white backdrop-blur transition-all hover:bg-white/20 sm:px-4 sm:text-base"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  )
}
