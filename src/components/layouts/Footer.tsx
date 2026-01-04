'use client'

import Link from 'next/link'
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

  if (variant === 'minimal') {
    return (
      <footer className="pb-10 text-white/70">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 border-t border-white/10 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <HomeMatchLogo size="sm" textClassName="text-white" />
              <p className="text-white/60">
                &copy; {currentYear} HomeMatch. All rights reserved.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/60 transition hover:text-white"
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
    <footer className="relative mt-2 pb-16 text-white/80">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-12 shadow-[0_25px_90px_rgba(2,10,31,0.65)] backdrop-blur-2xl sm:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <HomeMatchLogo
                size="sm"
                textClassName="text-white"
                className="mb-3"
              />
              <p className="text-[11px] tracking-[0.45em] text-cyan-200/80 uppercase">
                Keep the journey going
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                Finish decisions later without losing the vibe.
              </h2>
              <p className="mt-2 text-sm text-white/70">
                Everything you care about—mutual likes, household progress, and
                saved searches—stays in sync across the app.
              </p>
            </div>
            <Link
              href="/profile"
              className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-cyan-200/70 hover:bg-white/20"
            >
              Update profile
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {highlightLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition duration-200 hover:border-cyan-200/40 hover:bg-white/[0.08]"
                >
                  <div className="rounded-2xl bg-white/10 p-3 text-cyan-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-white">
                    {link.label}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {link.description}
                  </p>
                </Link>
              )
            })}
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {currentYear} HomeMatch. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/70 transition hover:text-white"
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
