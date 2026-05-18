import Link from 'next/link'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-hm-canvas text-hm-ink">
      <div className="max-w-lg px-6 text-center">
        <div className="mb-6 flex justify-center">
          <HomeMatchLogo size="lg" />
        </div>
        <h1 className="mb-3 text-7xl font-black text-hm-faint/40">404</h1>
        <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Page not found
        </h2>
        <p className="mb-4 text-base text-hm-muted sm:text-lg">
          We couldn&apos;t find the page you&apos;re looking for. It may have
          moved, been renamed, or never existed.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-hm-accent/10 px-6 py-3 text-sm font-semibold text-hm-accent-strong ring-1 ring-hm-accent/20 transition-all duration-200 hover:bg-hm-accent/20 hover:ring-hm-accent/30"
          >
            Back to home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-hm-border px-6 py-3 text-sm font-medium text-hm-muted transition-all duration-200 hover:border-hm-border-strong hover:text-hm-ink"
          >
            Contact us
          </Link>
        </div>
      </div>
    </main>
  )
}
