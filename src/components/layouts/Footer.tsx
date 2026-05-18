'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Compass, Heart, Users } from 'lucide-react'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'

const highlightLinks = [
  {
    href: '/dashboard',
    label: 'Keep exploring',
    description: 'Jump back into your recommendations',
    icon: Compass,
  },
  {
    href: '/dashboard/liked',
    label: 'Review favorites',
    description: 'See the homes your household liked',
    icon: Heart,
  },
  {
    href: '/couples',
    label: 'Household hub',
    description: 'Sync decisions with your household',
    icon: Users,
  },
]

const legalLinks = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/cookies', label: 'Cookie Policy' },
]

interface FooterProps {
  variant?: 'cta' | 'minimal'
}

export function Footer({ variant = 'cta' }: FooterProps) {
  const currentYear = new Date().getFullYear()
  const pathname = usePathname()
  // Filter highlight cards to avoid linking back to the page the user is on
  // (e.g. "Keep exploring → /dashboard" while already on /dashboard).
  const visibleHighlightLinks = highlightLinks.filter(
    (link) => link.href !== pathname
  )

  if (variant === 'minimal') {
    return (
      <footer className="text-hm-stone-500 pb-10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="border-hm-stone-600/60 flex flex-col gap-4 border-t py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <HomeMatchLogo size="sm" textClassName="text-hm-stone-200" />
              <p className="text-hm-stone-500">
                &copy; {currentYear} HomeMatch. All rights reserved.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-hm-stone-500 transition hover:text-hm-ink"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="text-hm-stone-400 relative mt-2 pb-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="border-hm-stone-600/60 bg-hm-obsidian-900/80 relative overflow-hidden rounded-[32px] border px-6 py-12 shadow-[0_20px_55px_rgba(52,43,37,0.10)] backdrop-blur-2xl sm:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <HomeMatchLogo
                size="sm"
                textClassName="text-hm-stone-200"
                className="mb-3"
              />
              <p className="text-[11px] tracking-[0.45em] text-hm-accent/80 uppercase">
                Keep the journey going
              </p>
              <h2 className="text-hm-stone-200 mt-3 text-2xl font-semibold sm:text-3xl">
                Finish decisions later without losing the vibe.
              </h2>
              <p className="text-hm-stone-500 mt-2 text-sm">
                Everything you care about—mutual likes, household progress, and
                saved searches—stays in sync across the app.
              </p>
            </div>
            <Link
              href="/profile"
              className="group border-hm-stone-600/60 bg-hm-obsidian-800 text-hm-stone-200 inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-hm-accent/70 hover:bg-white/20"
            >
              Update profile
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleHighlightLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-hm-stone-600/60 bg-hm-obsidian-900/70 hover:bg-hm-obsidian-800/70 flex flex-col rounded-2xl border p-5 transition duration-200 hover:border-hm-accent/40"
                >
                  <div className="bg-hm-obsidian-800 rounded-2xl p-3 text-hm-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-hm-stone-200 mt-4 text-base font-semibold">
                    {link.label}
                  </p>
                  <p className="text-hm-stone-500 mt-1 text-sm">
                    {link.description}
                  </p>
                </Link>
              )
            })}
          </div>

          <div className="border-hm-stone-600/60 text-hm-stone-500 mt-10 flex flex-col gap-4 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {currentYear} HomeMatch. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-hm-stone-500 transition hover:text-hm-ink"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
