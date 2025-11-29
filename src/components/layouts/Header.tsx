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
import { signOut } from '@/lib/supabase/actions'
import { useState, useEffect, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { HomeMatchLogo } from '@/components/shared/home-match-logo'
import { ProfileMenu } from '@/components/shared/ProfileMenu'
import { useCurrentUserAvatar } from '@/hooks/useCurrentUserAvatar'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSigningOut, startTransition] = useTransition()
  const { displayName, email, avatar, isLoading } = useCurrentUserAvatar()

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        await signOut()
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
    },
    {
      href: '/dashboard/liked',
      icon: Heart,
      label: 'Liked',
    },
    {
      href: '/dashboard/passed',
      icon: X,
      label: 'Passed',
    },
    {
      href: '/couples',
      icon: HeartHandshake,
      label: 'Matches',
    },
  ]

  return (
    <>
      <header
        className={cn(
          'bg-primary/10 sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-300',
          isScrolled
            ? 'border-white/15 bg-[#07132b]/85 shadow-[0_8px_30px_rgba(6,12,33,0.45)]'
            : 'bg-token-primary-dark/10 border-token-primary/20'
        )}
      >
        <nav className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="focus-visible:ring-token-primary-light focus-visible:ring-offset-token-primary-dark rounded-token-md px-token-md py-token-sm inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center gap-2 font-semibold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                aria-label="HomeMatch - Go to dashboard"
                data-testid="nav-dashboard"
              >
                <HomeMatchLogo size="sm" textClassName="text-white" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              {navigationLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="p-token-md transition-token-colors hover:bg-token-primary/20 rounded-token-md focus-visible:ring-token-primary-light focus-visible:ring-offset-token-primary-dark inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center space-x-2 text-white/80 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    aria-label={link.label}
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
                className="rounded-token-md p-token-sm transition-token-all hover:bg-token-primary/20 focus-visible:ring-token-primary-light focus-visible:ring-offset-token-primary-dark inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center text-white/80 hover:scale-105 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 md:hidden"
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
              className="border-token-primary/20 bg-token-primary-dark/95 fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] border-l backdrop-blur-md md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              style={{ touchAction: 'none' }}
            >
              {/* Mobile Menu Header */}
              <div className="border-token-primary/20 p-token-lg flex h-16 items-center justify-between border-b">
                <span className="text-token-lg font-semibold text-white">
                  Menu
                </span>
                <button
                  onClick={closeMobileMenu}
                  className="rounded-token-md p-token-sm transition-token-all hover:bg-token-primary/20 focus-visible:ring-token-primary-light inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center text-white/80 hover:scale-105 hover:text-white focus-visible:ring-2 focus-visible:outline-none active:scale-95"
                  aria-label="Close navigation menu"
                  type="button"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>

              {/* Mobile Menu Content */}
              <nav className="p-token-lg">
                <ul className="space-y-2">
                  {navigationLinks.map((link) => {
                    const Icon = link.icon
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={closeMobileMenu}
                          className="rounded-token-lg p-token-md transition-token-all hover:bg-token-primary/20 active:bg-token-primary/30 focus-visible:ring-token-primary-light flex min-h-[52px] touch-manipulation items-center space-x-3 text-white/80 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <Icon className="h-6 w-6 flex-shrink-0" />
                          <span className="text-token-lg font-medium">
                            {link.label}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>

                {/* Mobile Menu User Section */}
                <div className="mt-8 border-t border-white/[0.08] pt-6">
                  {/* User Info */}
                  <div className="mb-4 flex items-center gap-3 px-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-sm font-semibold text-white/90 ring-1 ring-white/10">
                      {displayName?.[0]?.toUpperCase() ||
                        email?.[0]?.toUpperCase() ||
                        '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {displayName || 'Welcome'}
                      </p>
                      {email && (
                        <p className="truncate text-xs text-white/50">
                          {email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Link
                      href="/profile"
                      onClick={closeMobileMenu}
                      className="group flex min-h-[52px] touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-white/75 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:text-white focus-visible:outline-none"
                      data-testid="nav-profile"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] transition-all duration-200 group-hover:from-white/[0.12] group-hover:to-white/[0.06]">
                        <User className="h-5 w-5" />
                      </span>
                      <span className="text-[15px] font-medium">Profile</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={closeMobileMenu}
                      className="group flex min-h-[52px] touch-manipulation items-center gap-3 rounded-xl px-3 py-3 text-white/75 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.06] focus-visible:text-white focus-visible:outline-none"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] transition-all duration-200 group-hover:from-white/[0.12] group-hover:to-white/[0.06]">
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
                          : 'text-white/60 hover:bg-rose-500/10 hover:text-rose-400 focus-visible:bg-rose-500/10 focus-visible:text-rose-400'
                      )}
                      type="button"
                      data-testid="logout-button"
                    >
                      <span
                        className={cn(
                          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                          isSigningOut
                            ? 'bg-white/[0.05]'
                            : 'bg-gradient-to-br from-white/[0.06] to-transparent group-hover:from-rose-500/15 group-hover:to-rose-500/5'
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
