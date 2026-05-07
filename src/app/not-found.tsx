import Link from 'next/link'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030712] text-white">
      <div className="max-w-lg px-6 text-center">
        <div className="mb-6 flex justify-center">
          <HomeMatchLogo size="lg" />
        </div>
        <h1 className="mb-3 text-7xl font-black text-white/15">404</h1>
        <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Page not found
        </h2>
        <p className="mb-4 text-base text-slate-400 sm:text-lg">
          We couldn&apos;t find the page you&apos;re looking for. It may have
          moved, been renamed, or never existed.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition-all duration-200 hover:bg-white/20 hover:ring-white/30"
          >
            Back to home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-slate-400 transition-all duration-200 hover:border-white/20 hover:text-white"
          >
            Contact us
          </Link>
        </div>
      </div>
    </main>
  )
}
