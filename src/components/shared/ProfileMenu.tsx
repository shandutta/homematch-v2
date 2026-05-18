'use client'

import Link from 'next/link'
import { Settings, User, LogOut, ChevronRight } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { AvatarData } from '@/lib/constants/avatars'

interface ProfileMenuProps {
  displayName?: string | null
  email?: string | null
  avatar?: AvatarData | null
  isLoading?: boolean
  isSigningOut?: boolean
  onSignOut: () => void
}

/**
 * Refined profile dropdown menu with user info header
 * Features a luxury aesthetic with subtle animations
 */
export function ProfileMenu({
  displayName,
  email,
  avatar,
  isLoading,
  isSigningOut,
  onSignOut,
}: ProfileMenuProps) {
  // Keep IDs deterministic to avoid Radix-generated hydration mismatches
  const triggerId = 'profile-menu-trigger'
  const contentId = 'profile-menu-content'

  // Truncate email for display
  const displayEmail = email
    ? email.length > 24
      ? `${email.slice(0, 22)}...`
      : email
    : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group relative inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center rounded-full p-1 transition-all duration-300 ease-out hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-hm-border/30 focus-visible:ring-offset-2 focus-visible:ring-offset-hm-canvas focus-visible:outline-none active:scale-95"
          data-testid="user-menu"
          id={triggerId}
          aria-controls={contentId}
        >
          {/* Ambient glow on hover */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-hm-ink/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Ring effect */}
          <span className="absolute inset-0 rounded-full ring-2 ring-hm-border/10 transition-all duration-300 group-hover:ring-hm-border/25" />

          {isLoading ? (
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-hm-ink/10 to-hm-ink/5">
              <User className="h-5 w-5 text-hm-muted" />
            </span>
          ) : (
            <UserAvatar
              displayName={displayName}
              email={email}
              avatar={avatar}
              size="sm"
              className="relative ring-0"
            />
          )}
          <span className="sr-only">User menu</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="profile-menu-content bg-hm-surface w-72 overflow-hidden rounded-2xl border border-hm-border p-0 shadow-[0_25px_60px_-12px_rgba(52,43,37,0.18)] backdrop-blur-xl"
        sideOffset={12}
        alignOffset={0}
        id={contentId}
        aria-labelledby={triggerId}
      >
        {/* User Info Header */}
        <div className="relative overflow-hidden border-b border-hm-border bg-gradient-to-br from-hm-ink/[0.04] to-transparent px-5 py-5">
          {/* Subtle mesh background */}
          <div className="absolute inset-0 opacity-30">
            <div className="from-hm-accent/20 absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-2xl" />
            <div className="from-hm-accent-strong/10 absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-gradient-to-br to-transparent blur-xl" />
          </div>

          <div className="relative flex items-center gap-4">
            <UserAvatar
              displayName={displayName}
              email={email}
              avatar={avatar}
              size="lg"
              className="shadow-lg ring-2 ring-hm-border/10"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold tracking-tight text-hm-ink">
                {displayName || 'Welcome'}
              </p>
              {displayEmail && (
                <p className="mt-0.5 truncate text-[13px] font-light tracking-wide text-hm-muted">
                  {displayEmail}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-2">
          <DropdownMenuItem asChild>
            <Link
              href="/profile"
              className="group/item flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[14px] text-hm-ink-soft transition-all duration-200 hover:bg-hm-canvas hover:text-hm-ink focus:bg-hm-canvas focus:text-hm-ink data-[highlighted]:bg-hm-canvas data-[highlighted]:text-hm-ink"
              data-testid="nav-profile"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-hm-ink/[0.08] to-hm-ink/[0.03] transition-all duration-200 group-hover/item:from-hm-ink/[0.12] group-hover/item:to-hm-ink/[0.06]">
                <User className="h-4 w-4" />
              </span>
              <span className="flex-1 font-medium">Profile</span>
              <ChevronRight className="h-4 w-4 text-hm-faint transition-transform duration-200 group-hover/item:translate-x-0.5 group-hover/item:text-hm-muted" />
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/settings"
              className="group/item flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[14px] text-hm-ink-soft transition-all duration-200 hover:bg-hm-canvas hover:text-hm-ink focus:bg-hm-canvas focus:text-hm-ink data-[highlighted]:bg-hm-canvas data-[highlighted]:text-hm-ink"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-hm-ink/[0.08] to-hm-ink/[0.03] transition-all duration-200 group-hover/item:from-hm-ink/[0.12] group-hover/item:to-hm-ink/[0.06]">
                <Settings className="h-4 w-4" />
              </span>
              <span className="flex-1 font-medium">Settings</span>
              <ChevronRight className="h-4 w-4 text-hm-faint transition-transform duration-200 group-hover/item:translate-x-0.5 group-hover/item:text-hm-muted" />
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-hm-border mx-4" />

        {/* Sign Out */}
        <div className="p-2">
          <DropdownMenuItem
            disabled={isSigningOut}
            onClick={onSignOut}
            className={cn(
              'group/item flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[14px] transition-all duration-200',
              isSigningOut
                ? 'cursor-not-allowed opacity-50'
                : 'text-hm-muted hover:bg-rose-500/10 hover:text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 data-[highlighted]:bg-rose-500/10 data-[highlighted]:text-rose-400'
            )}
            data-testid="logout-button"
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                isSigningOut
                  ? 'bg-hm-canvas'
                  : 'bg-gradient-to-br from-hm-ink/[0.06] to-transparent group-hover/item:from-rose-500/15 group-hover/item:to-rose-500/5'
              )}
            >
              <LogOut className="h-4 w-4" />
            </span>
            <span className="flex-1 font-medium">
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
