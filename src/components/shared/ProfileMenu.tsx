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
          className="group relative inline-flex min-h-[48px] min-w-[48px] touch-manipulation items-center justify-center rounded-full p-1 transition-all duration-300 ease-out hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07132b] focus-visible:outline-none active:scale-95"
          data-testid="user-menu"
          id={triggerId}
          aria-controls={contentId}
        >
          {/* Ambient glow on hover */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Ring effect */}
          <span className="absolute inset-0 rounded-full ring-2 ring-white/10 transition-all duration-300 group-hover:ring-white/25" />

          {isLoading ? (
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/5">
              <User className="h-5 w-5 text-white/60" />
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
        className="profile-menu-content w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#0a1628]/98 p-0 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6),0_0_40px_rgba(7,19,43,0.4)] backdrop-blur-xl"
        sideOffset={12}
        alignOffset={0}
        id={contentId}
        aria-labelledby={triggerId}
      >
        {/* User Info Header */}
        <div className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent px-5 py-5">
          {/* Subtle mesh background */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-transparent blur-2xl" />
            <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-gradient-to-br from-purple-500/10 to-transparent blur-xl" />
          </div>

          <div className="relative flex items-center gap-4">
            <UserAvatar
              displayName={displayName}
              email={email}
              avatar={avatar}
              size="lg"
              className="shadow-lg ring-2 ring-white/10"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold tracking-tight text-white">
                {displayName || 'Welcome'}
              </p>
              {displayEmail && (
                <p className="mt-0.5 truncate text-[13px] font-light tracking-wide text-white/50">
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
              className="group/item flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[14px] text-white/75 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus:bg-white/[0.06] focus:text-white data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white"
              data-testid="nav-profile"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] transition-all duration-200 group-hover/item:from-white/[0.12] group-hover/item:to-white/[0.06]">
                <User className="h-4 w-4" />
              </span>
              <span className="flex-1 font-medium">Profile</span>
              <ChevronRight className="h-4 w-4 text-white/30 transition-transform duration-200 group-hover/item:translate-x-0.5 group-hover/item:text-white/50" />
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/settings"
              className="group/item flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[14px] text-white/75 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus:bg-white/[0.06] focus:text-white data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] transition-all duration-200 group-hover/item:from-white/[0.12] group-hover/item:to-white/[0.06]">
                <Settings className="h-4 w-4" />
              </span>
              <span className="flex-1 font-medium">Settings</span>
              <ChevronRight className="h-4 w-4 text-white/30 transition-transform duration-200 group-hover/item:translate-x-0.5 group-hover/item:text-white/50" />
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="mx-4 bg-white/[0.06]" />

        {/* Sign Out */}
        <div className="p-2">
          <DropdownMenuItem
            disabled={isSigningOut}
            onClick={onSignOut}
            className={cn(
              'group/item flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[14px] transition-all duration-200',
              isSigningOut
                ? 'cursor-not-allowed opacity-50'
                : 'text-white/60 hover:bg-rose-500/10 hover:text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 data-[highlighted]:bg-rose-500/10 data-[highlighted]:text-rose-400'
            )}
            data-testid="logout-button"
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                isSigningOut
                  ? 'bg-white/[0.05]'
                  : 'bg-gradient-to-br from-white/[0.06] to-transparent group-hover/item:from-rose-500/15 group-hover/item:to-rose-500/5'
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
