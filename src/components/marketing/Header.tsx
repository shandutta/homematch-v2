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

      {/* Nav content */}
      <nav className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-6 sm:py-5">
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
          <motion.div
            variants={{
              hidden: { opacity: 0, y: -10 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <Link
              href="/login"
              className="group relative text-sm text-white/80 transition-colors hover:text-white sm:text-base"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Log In
              {/* Animated underline on hover */}
              <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-gradient-to-r from-sky-400 to-cyan-400 transition-transform duration-300 group-hover:scale-x-100" />
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
              className="group relative overflow-hidden rounded-lg bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 sm:px-4 sm:text-base"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span className="relative z-10">Sign Up</span>
              {/* Shimmer effect on hover */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            </Link>
          </motion.div>
        </motion.div>
      </nav>
    </motion.header>
  )
}
