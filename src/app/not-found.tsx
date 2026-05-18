import Link from 'next/link'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <main className="bg-hm-canvas text-hm-ink flex min-h-screen items-center justify-center">
      <div className="max-w-lg px-6 text-center">
        <div className="mb-6 flex justify-center">
          <HomeMatchLogo size="lg" />
        </div>
        <h1 className="text-hm-faint/40 mb-3 text-7xl font-black">404</h1>
        <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Page not found
        </h2>
        <p className="text-hm-muted mb-4 text-base sm:text-lg">
          We couldn&apos;t find the page you&apos;re looking for. It may have
          moved, been renamed, or never existed.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="bg-hm-accent/10 text-hm-accent-strong ring-hm-accent/20 hover:bg-hm-accent/20 hover:ring-hm-accent/30 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold ring-1 transition-all duration-200"
          >
            Back to home
          </Link>
          <Link
            href="/contact"
            className="border-hm-border text-hm-muted hover:border-hm-border-strong hover:text-hm-ink inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-medium transition-all duration-200"
          >
            Contact us
          </Link>
        </div>
      </div>
    </main>
  )
}
