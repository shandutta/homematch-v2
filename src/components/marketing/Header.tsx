'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { m, useReducedMotion } from 'framer-motion'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'

export function Header() {
  const [hasScrolled, setHasScrolled] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Track scroll position for state-based styling
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <m.header
      className="fixed top-0 z-50 w-full transition-shadow duration-300"
      style={{
        boxShadow: hasScrolled
          ? '0 4px 24px rgba(43, 30, 18, 0.1)'
          : '0 0 0 rgba(43, 30, 18, 0)',
      }}
    >
      {/* Warm translucent background layer — fades in on scroll */}
      <m.div
        className="absolute inset-0 border-b transition-colors duration-300"
        style={{
          backgroundColor: `rgba(255, 250, 242, ${hasScrolled ? 0.85 : 0})`,
          backdropFilter: `blur(${hasScrolled ? 12 : 0}px)`,
          borderColor: hasScrolled ? 'rgba(95, 85, 77, 0.15)' : 'transparent',
        }}
      />

      {/* Nav content - compact when scrolled */}
      <nav
        className={`relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 transition-all duration-300 sm:px-6 ${
          hasScrolled ? 'py-2 sm:py-2.5' : 'py-4 sm:py-5'
        }`}
      >
        {/* Logo with entrance animation */}
        <m.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1 }}
          transition={
            shouldReduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.1 }
          }
        >
          <Link
            href="/"
            className="group text-hm-ink focus-visible:ring-hm-focus/50 rounded-xl px-3 py-2 transition-opacity duration-200 hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
            style={{ fontFamily: 'var(--font-heading)' }}
            aria-label="HomeMatch - Go to homepage"
          >
            <m.div
              whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <HomeMatchLogo size="sm" textClassName="text-hm-ink" />
            </m.div>
          </Link>
        </m.div>

        {/* Nav links with staggered entrance */}
        <m.div
          className="flex items-center gap-3 sm:gap-6"
          initial={shouldReduceMotion ? false : 'hidden'}
          animate={shouldReduceMotion ? undefined : 'visible'}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
              },
            },
          }}
        >
          {/* Auth buttons container - unified warm pill */}
          <div className="bg-hm-surface/80 ring-hm-border flex items-center gap-1 rounded-full p-1 ring-1 backdrop-blur-md">
            <m.div
              variants={{
                hidden: { opacity: 0, y: -10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Link
                href="/login"
                className="text-hm-muted hover:bg-hm-ink/5 hover:text-hm-ink inline-flex min-h-[44px] items-center rounded-full px-5 py-2 text-sm transition-all duration-300 sm:px-6 sm:py-2.5 sm:text-base"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Log In
              </Link>
            </m.div>

            <m.div
              variants={{
                hidden: { opacity: 0, y: -10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Link
                href="/signup"
                className="bg-hm-ink text-hm-surface hover:bg-hm-ink-soft inline-flex min-h-[44px] items-center rounded-full px-5 py-2 text-sm transition-all duration-300 sm:px-6 sm:py-2.5 sm:text-base"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Sign Up
              </Link>
            </m.div>
          </div>
        </m.div>
      </nav>
    </m.header>
  )
}
