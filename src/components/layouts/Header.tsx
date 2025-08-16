'use client'

import Link from 'next/link'
import { Heart, Eye, X, Settings, User, Menu } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { MotionDiv, fadeIn, slideInRight, fastTransition } from '@/components/ui/motion-components'
import { CouplesMessages } from '@/lib/utils/couples-messaging'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

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
      href: '/dashboard/liked',
      icon: Heart,
      label: 'Our Favorites',
    },
    {
      href: '/couples',
      icon: Heart,
      label: CouplesMessages.navigation.couples,
    },
    {
      href: '/dashboard/viewed',
      icon: Eye,
      label: 'Explored',
    },
  ]

  return (
    <>
      <header className="border-token-primary/20 bg-token-primary-dark/10 sticky top-0 z-50 border-b backdrop-blur-md">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="p-token-sm text-token-xl focus-visible:ring-token-primary-light focus-visible:ring-offset-token-primary-dark rounded-token-md inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center font-bold text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                aria-label="HomeMatch - Go to dashboard"
                data-testid="nav-dashboard"
              >
                HomeMatch
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
                    className="p-token-md text-token-primary-light transition-token-colors hover:bg-token-primary/20 rounded-token-md focus-visible:ring-token-primary-light focus-visible:ring-offset-token-primary-dark inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center space-x-2 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    aria-label={`${link.label} properties`}
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
                className="rounded-token-md p-token-sm text-token-primary-light transition-token-all hover:bg-token-primary/20 focus-visible:ring-token-primary-light focus-visible:ring-offset-token-primary-dark inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center hover:scale-105 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 md:hidden"
                aria-label="Open navigation menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                type="button"
              >
                <Menu className="h-7 w-7" />
              </button>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="p-token-sm text-token-primary-light transition-token-all hover:bg-token-primary/20 focus-visible:ring-token-primary-light focus-visible:ring-offset-token-primary-dark inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center rounded-full hover:scale-105 hover:text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
                    data-testid="user-menu"
                  >
                    <User className="h-7 w-7" />
                    <span className="sr-only">User menu</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="border-token-primary/20 bg-token-primary-dark/95 w-48 backdrop-blur-md"
                  sideOffset={8}
                  alignOffset={-4}
                >
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="text-token-primary-light p-token-md flex min-h-[44px] cursor-pointer touch-manipulation items-center hover:text-white"
                      data-testid="nav-profile"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/settings"
                      className="text-token-primary-light p-token-md flex min-h-[44px] cursor-pointer touch-manipulation items-center hover:text-white"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-token-primary/20" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-token-primary-light p-token-md flex min-h-[44px] cursor-pointer touch-manipulation items-center hover:text-white"
                    data-testid="logout-button"
                  >
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  className="rounded-token-md p-token-sm text-token-primary-light transition-token-all hover:bg-token-primary/20 focus-visible:ring-token-primary-light inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center hover:scale-105 hover:text-white focus-visible:ring-2 focus-visible:outline-none active:scale-95"
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
                          className="rounded-token-lg p-token-md text-token-primary-light transition-token-all hover:bg-token-primary/20 active:bg-token-primary/30 focus-visible:ring-token-primary-light flex min-h-[52px] touch-manipulation items-center space-x-3 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
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
                <div className="border-token-primary/20 mt-8 space-y-2 border-t pt-6">
                  <Link
                    href="/profile"
                    onClick={closeMobileMenu}
                    className="rounded-token-lg p-token-md text-token-primary-light transition-token-all hover:bg-token-primary/20 active:bg-token-primary/30 focus-visible:ring-token-primary-light flex min-h-[52px] touch-manipulation items-center space-x-3 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                    data-testid="nav-profile"
                  >
                    <User className="h-6 w-6 flex-shrink-0" />
                    <span className="text-token-lg font-medium">Profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={closeMobileMenu}
                    className="rounded-token-lg p-token-md text-token-primary-light transition-token-all hover:bg-token-primary/20 active:bg-token-primary/30 focus-visible:ring-token-primary-light flex min-h-[52px] touch-manipulation items-center space-x-3 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Settings className="h-6 w-6 flex-shrink-0" />
                    <span className="text-token-lg font-medium">Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut()
                      closeMobileMenu()
                    }}
                    className="rounded-token-lg p-token-md text-token-primary-light transition-token-all hover:bg-token-primary/20 active:bg-token-primary/30 focus-visible:ring-token-primary-light flex min-h-[52px] w-full touch-manipulation items-center space-x-3 text-left hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                    type="button"
                    data-testid="logout-button"
                  >
                    <span className="text-token-lg font-medium">Sign Out</span>
                  </button>
                </div>
              </nav>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
