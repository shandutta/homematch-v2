import Link from 'next/link'

export function Header() {
  return (
    <header className="absolute top-0 z-50 w-full">
      {/* Align header content with hero container and text column */}
      <nav className="container mx-auto flex items-center justify-between px-6 py-6 sm:px-4 sm:py-8">
        <Link
          href="/"
          className="text-xl font-bold text-white sm:ml-4 sm:text-2xl"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          HomeMatch
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
