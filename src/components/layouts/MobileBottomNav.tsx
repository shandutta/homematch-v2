'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, HeartHandshake, History, Home, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  isActive: (pathname: string) => boolean
  testId: string
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Explore',
    icon: Home,
    isActive: (pathname) => pathname === '/dashboard',
    testId: 'bottom-nav-dashboard',
  },
  {
    href: '/dashboard/viewed',
    label: 'Viewed',
    icon: History,
    isActive: (pathname) =>
      pathname === '/dashboard/viewed' ||
      pathname.startsWith('/dashboard/viewed/'),
    testId: 'bottom-nav-viewed',
  },
  {
    href: '/dashboard/liked',
    label: 'Liked',
    icon: Heart,
    isActive: (pathname) =>
      pathname === '/dashboard/liked' ||
      pathname.startsWith('/dashboard/liked/'),
    testId: 'bottom-nav-liked',
  },
  {
    href: '/dashboard/passed',
    label: 'Passed',
    icon: X,
    isActive: (pathname) =>
      pathname === '/dashboard/passed' ||
      pathname.startsWith('/dashboard/passed/'),
    testId: 'bottom-nav-passed',
  },
  {
    href: '/couples',
    label: 'Matches',
    icon: HeartHandshake,
    isActive: (pathname) =>
      pathname === '/couples' ||
      pathname.startsWith('/couples/') ||
      pathname === '/household' ||
      pathname.startsWith('/household/'),
    testId: 'bottom-nav-matches',
  },
]

interface MobileBottomNavProps {
  className?: string
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const pathname = usePathname() ?? ''

  return (
    <nav
      className={cn(
        'bottom-nav safe-area-bottom fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#07132b]/92 backdrop-blur-xl md:hidden',
        className
      )}
      aria-label="Primary"
      data-testid="bottom-nav"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-2 pb-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.isActive(pathname)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group focus-visible:ring-offset-background flex min-h-[52px] min-w-[56px] flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 focus-visible:outline-none',
                isActive
                  ? 'bg-white/[0.08] text-white shadow-[0_12px_30px_rgba(0,0,0,0.25)]'
                  : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              data-testid={item.testId}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform duration-200 group-active:scale-95',
                  isActive ? 'text-amber-300' : 'text-white/70'
                )}
                strokeWidth={2}
              />
              <span className="leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
