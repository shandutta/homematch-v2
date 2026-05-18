'use client'

import Link from 'next/link'
import {
  Heart,
  X,
  Settings,
  User,
  Menu,
  History,
  HeartHandshake,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import {
  MotionDiv,
  fadeIn,
  slideInRight,
  fastTransition,
} from '@/components/ui/motion-components'
import { useState, useEffect, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'
import { ProfileMenu } from '@/components/shared/ProfileMenu'
import { useCurrentUserAvatar } from '@/hooks/useCurrentUserAvatar'
import { createClient } from '@/lib/supabase/client'
import { usePathname, useRouter } from 'next/navigation'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSigningOut, startTransition] = useTransition()
  const pathname = usePathname() ?? ''
  const { displayName, email, avatar, isLoading } = useCurrentUserAvatar()
  const router = useRouter()

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        const supabase = await createClient()
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        router.refresh()
        router.push('/')
      } catch (error) {
        console.error('Sign out failed', error)
      }
    })
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMobileMenu()
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const navigationLinks = [
    {
      href: '/dashboard/viewed',
      icon: History,
      label: 'Viewed',
      matchPrefixes: ['/dashboard/viewed'],
    },
    {
      href: '/dashboard/liked',
      icon: Heart,
      label: 'Liked',
      matchPrefixes: ['/dashboard/liked'],
    },
    {
      href: '/dashboard/passed',
      icon: X,
      label: 'Passed',
      matchPrefixes: ['/dashboard/passed'],
    },
    {
      href: '/couples',
      icon: HeartHandshake,
      label: 'Shared Likes',
      matchPrefixes: ['/couples', '/household'],
    },
  ]

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-300',
          isScrolled
            ? 'border-hm-border/70 bg-hm-surface/92 shadow-[0_8px_26px_rgba(52,43,37,0.08)]'
            : 'border-hm-border/50 bg-hm-canvas/75'
        )}
      >
        <nav className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="focus-visible:ring-token-primary-light focus-visible:ring-offset-token-primary-dark px-token-md py-token-sm text-hm-ink inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center gap-2 rounded-md font-semibold transition-opacity duration-200 hover:opacity-80 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                aria-label="HomeMatch - Go to dashboard"
                data-testid="nav-dashboard"
              >
                <HomeMatchLogo size="sm" textClassName="text-hm-ink" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              {navigationLinks.map((link) => {
                const Icon = link.icon
                const isActive = link.matchPrefixes.some(
                  (prefix) =>
                    pathname === prefix || pathname.startsWith(`${prefix}/`)
                )
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'focus-visible:ring-token-primary-light focus-visible:ring-offset-token-primary-dark text-hm-muted hover:text-hm-ink inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center space-x-2 rounded-md p-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                      isActive
                        ? 'bg-hm-surface/80 text-hm-ink ring-hm-accent/20 after:bg-hm-accent relative shadow-[0_10px_24px_rgba(52,43,37,0.08)] ring-1 after:absolute after:inset-x-4 after:bottom-1 after:h-[2px] after:rounded-full after:content-[""]'
                        : 'hover:bg-hm-surface/70'
                    )}
                    aria-label={link.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="hidden lg:inline">{link.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="flex items-center space-x-2">
              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="hover:bg-token-primary/20 focus-visible:ring-token-primary-light focus-visible:ring-offset-token-primary-dark text-hm-muted hover:text-hm-ink inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center rounded-md p-2 transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 md:hidden"
                aria-label="Open navigation menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                type="button"
              >
                <Menu className="h-7 w-7" />
              </button>

              {/* User Profile Menu */}
              <ProfileMenu
                displayName={displayName}
                email={email}
                avatar={avatar}
                isLoading={isLoading}
                isSigningOut={isSigningOut}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <MotionDiv
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={fastTransition}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            {/* Mobile Menu Drawer */}
            <MotionDiv
              id="mobile-menu"
              variants={slideInRight}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                duration: 0.3,
              }}
              className="border-hm-border/70 bg-hm-surface/95 fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] border-l shadow-2xl backdrop-blur-md md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              style={{ touchAction: 'none' }}
            >
              {/* Mobile Menu Header */}
              <div className="border-token-primary/20 flex h-16 items-center justify-between border-b p-6">
                <span className="text-hm-ink text-lg font-semibold">Menu</span>
                <button
                  onClick={closeMobileMenu}
                  className="hover:bg-token-primary/20 focus-visible:ring-token-primary-light text-hm-muted hover:text-hm-ink inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center rounded-md p-2 transition-all hover:scale-105 focus-visible:ring-2 focus-visible:outline-none active:scale-95"
                  aria-label="Close navigation menu"
                  type="button"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>

              {/* Mobile Menu Content */}
              <nav className="p-6">
                <ul className="space-y-2">
                  {navigationLinks.map((link) => {
                    const Icon = link.icon
                    const isActive = link.matchPrefixes.some(
                      (prefix) =>
                        pathname === prefix || pathname.startsWith(`${prefix}/`)
                    )
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={closeMobileMenu}
                          className={cn(
                            'focus-visible:ring-token-primary-light text-hm-muted hover:text-hm-ink flex min-h-[52px] touch-manipulation items-center space-x-3 rounded-lg p-4 transition-all focus-visible:ring-2 focus-visible:outline-none',
                            isActive
                              ? 'bg-hm-surface/80 text-hm-ink ring-hm-accent/20 ring-1'
                              : 'hover:bg-hm-surface/70 active:bg-hm-surface'
                          )}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon className="h-6 w-6 flex-shrink-0" />
                          <span className="text-lg font-medium">
                            {link.label}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>

                {/* Mobile Menu User Section */}
                <div className="border-hm-border/60 mt-8 border-t pt-6">
                  {/* User Info */}
                  <div className="mb-4 flex items-center gap-3 px-2">
                    <div className="from-hm-accent-strong via-hm-accent-strong to-hm-surface ring-hm-accent/20 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white ring-1">
                      {displayName?.[0]?.toUpperCase() ||
                        email?.[0]?.toUpperCase() ||
                        '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-hm-ink truncate text-sm font-medium">
                        {displayName || 'Welcome'}
                      </p>
                      {email && (
                        <p className="text-hm-muted truncate text-xs">
                          {email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href="/profile"
                      onClick={closeMobileMenu}
                      className="group text-hm-muted hover:bg-hm-surface/70 hover:text-hm-ink focus-visible:bg-hm-surface/70 focus-visible:text-hm-ink flex min-h-[52px] touch-manipulation items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 focus-visible:outline-none"
                      data-testid="nav-profile"
                    >
                      <span className="from-hm-surface to-hm-surface group-hover:from-hm-surface group-hover:to-hm-surface flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br transition-all duration-200">
                        <User className="h-5 w-5" />
                      </span>
                      <span className="text-[15px] font-medium">Profile</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={closeMobileMenu}
                      className="group text-hm-muted hover:bg-hm-surface/70 hover:text-hm-ink focus-visible:bg-hm-surface/70 focus-visible:text-hm-ink flex min-h-[52px] touch-manipulation items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 focus-visible:outline-none"
                    >
                      <span className="from-hm-surface to-hm-surface group-hover:from-hm-surface group-hover:to-hm-surface flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br transition-all duration-200">
                        <Settings className="h-5 w-5" />
                      </span>
                      <span className="text-[15px] font-medium">Settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut()
                        closeMobileMenu()
                      }}
                      disabled={isSigningOut}
                      className={cn(
                        'group flex min-h-[52px] w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none',
                        isSigningOut
                          ? 'cursor-not-allowed opacity-50'
                          : 'text-hm-muted hover:bg-rose-50 hover:text-rose-700 focus-visible:bg-rose-500/10 focus-visible:text-rose-400'
                      )}
                      type="button"
                      data-testid="logout-button"
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                          isSigningOut
                            ? 'bg-hm-surface/60'
                            : 'from-hm-surface bg-gradient-to-br to-transparent group-hover:from-rose-100 group-hover:to-rose-50'
                        )}
                      >
                        <X className="h-5 w-5" />
                      </span>
                      <span className="text-[15px] font-medium">
                        {isSigningOut ? 'Signing out...' : 'Sign Out'}
                      </span>
                    </button>
                  </div>
                </div>
              </nav>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
