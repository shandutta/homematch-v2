'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MotionDiv } from '@/components/ui/motion-components'

// Animated link with hover underline
function AnimatedLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group relative inline-block transition-colors hover:text-white"
    >
      {children}
      <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-sky-400 to-cyan-400 transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  )
}

// Social icon with glow effect
function SocialIcon({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.a
      href={href}
      className="relative inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        style={{
          background:
            'radial-gradient(circle at center, rgba(56,189,248,0.3), transparent 70%)',
        }}
      />
      <span className="relative z-10">{children}</span>
    </motion.a>
  )
}

// Link column with staggered animation
function LinkColumn({
  title,
  links,
  delay = 0,
}: {
  title: string
  links: { href: string; label: string }[]
  delay?: number
}) {
  return (
    <MotionDiv
      className="text-center lg:text-left"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: delay,
          },
        },
      }}
    >
      <motion.h4
        className="text-token-sm mb-0 font-semibold tracking-wider uppercase lg:mb-4"
        style={{ fontFamily: 'var(--font-heading)' }}
        variants={{
          hidden: { opacity: 0, y: 10 },
          visible: { opacity: 1, y: 0 },
        }}
      >
        {title}
      </motion.h4>
      <ul
        className="text-token-sm space-y-0 leading-none text-white/70 lg:space-y-3 lg:leading-normal"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {links.map((link) => (
          <motion.li
            key={link.href}
            variants={{
              hidden: { opacity: 0, x: -10 },
              visible: { opacity: 1, x: 0 },
            }}
          >
            <AnimatedLink href={link.href}>{link.label}</AnimatedLink>
          </motion.li>
        ))}
      </ul>
    </MotionDiv>
  )
}

export function Footer() {
  const productLinks = [
    { href: '/signup', label: 'Get Started' },
    { href: '/login', label: 'Sign In' },
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How It Works' },
  ]

  const companyLinks = [
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
  ]

  const legalLinks = [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/cookies', label: 'Cookie Policy' },
  ]

  return (
    <footer className="bg-gradient-marketing-primary px-4 py-6 text-white sm:px-6 sm:py-8">
      <div className="container mx-auto max-w-5xl px-1 sm:px-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <MotionDiv
            className="col-span-2 mb-6 flex flex-col items-center lg:col-span-1 lg:items-start"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <motion.h3
              className="text-token-3xl text-center font-bold lg:text-left"
              style={{ fontFamily: 'var(--font-heading)' }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              HomeMatch
            </motion.h3>
            <div className="mt-1 flex gap-3">
              <SocialIcon
                href="https://twitter.com/homematch"
                label="X (formerly Twitter)"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                </svg>
              </SocialIcon>
              <SocialIcon
                href="https://instagram.com/homematch"
                label="Instagram"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </SocialIcon>
            </div>
          </MotionDiv>

          {/* Product */}
          <LinkColumn title="Product" links={productLinks} delay={0.1} />

          {/* Company */}
          <LinkColumn title="Company" links={companyLinks} delay={0.2} />

          {/* Legal */}
          <div className="mt-4 lg:mt-0">
            <LinkColumn title="Legal" links={legalLinks} delay={0.3} />
          </div>
        </div>

        <MotionDiv
          className="mt-6 border-t border-white/10 pt-4 text-center sm:mt-8 sm:pt-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p
            className="text-token-xs sm:text-token-sm flex items-center justify-center gap-1 text-white/70"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Built in the Bay Area
          </p>
          <p
            className="text-token-xs mt-1 text-white/50 sm:mt-2"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            &copy; 2024 HomeMatch. All rights reserved.
          </p>
        </MotionDiv>
      </div>
    </footer>
  )
}
