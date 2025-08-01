import Link from 'next/link'

export function Header() {
  return (
    <header className="absolute top-0 z-50 w-full">
      <nav className="container mx-auto flex items-center justify-between px-4 py-6">
        <Link
          href="/"
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          HomeMatch
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-white/80 transition-colors hover:text-white"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-white/10 px-4 py-2 text-white backdrop-blur transition-all hover:bg-white/20"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  )
}
