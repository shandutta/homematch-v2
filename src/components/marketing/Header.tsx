'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'

export function Header() {
  const [hasScrolled, setHasScrolled] = useState(false)

  // Track scroll position for state-based styling
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.header
      className="fixed top-0 z-50 w-full transition-shadow duration-300"
      style={{
        boxShadow: hasScrolled
          ? '0 4px 30px rgba(0, 0, 0, 0.2)'
          : '0 0 0 rgba(0, 0, 0, 0)',
      }}
    >
      {/* Glassmorphism background layer */}
      <motion.div
        className="absolute inset-0 border-b border-white/0 transition-colors duration-300"
        style={{
          backgroundColor: `rgba(3, 7, 18, ${hasScrolled ? 0.8 : 0})`,
          backdropFilter: `blur(${hasScrolled ? 12 : 0}px)`,
          borderColor: hasScrolled ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        }}
      />

      {/* Nav content - compact when scrolled */}
      <nav
        className={`relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 transition-all duration-300 ${
          hasScrolled ? 'py-2 sm:py-2.5' : 'py-4 sm:py-5'
        }`}
      >
        {/* Logo with entrance animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Link
            href="/"
            className="group rounded-xl px-3 py-2 text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
            style={{ fontFamily: 'var(--font-heading)' }}
            aria-label="HomeMatch - Go to homepage"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <HomeMatchLogo size="sm" textClassName="text-white" />
            </motion.div>
          </Link>
        </motion.div>

        {/* Nav links with staggered entrance */}
        <motion.div
          className="flex items-center gap-3 sm:gap-6"
          initial="hidden"
          animate="visible"
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
          {/* Auth buttons container - unified pill with shared animation language */}
          <div className="flex items-center gap-1 rounded-full bg-slate-800/60 p-1 ring-1 ring-white/10 backdrop-blur-md">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: -10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Link
                href="/login"
                className="group relative block overflow-hidden rounded-full px-5 py-2 text-sm text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white sm:px-6 sm:py-2.5 sm:text-base"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span className="relative z-10">Log In</span>
                {/* Shared glow effect on hover */}
                <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-opacity duration-300 group-hover:opacity-100" />
              </Link>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: -10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Link
                href="/signup"
                className="group relative block overflow-hidden rounded-full bg-white/10 px-5 py-2 text-sm text-white ring-1 ring-white/20 transition-all duration-300 hover:bg-white/[0.15] hover:ring-white/30 sm:px-6 sm:py-2.5 sm:text-base"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span className="relative z-10">Sign Up</span>
                {/* Shared glow effect - slightly brighter for primary CTA */}
                <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_0_12px_rgba(56,189,248,0.15)] transition-opacity duration-300 group-hover:opacity-100" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </nav>
    </motion.header>
  )
}
