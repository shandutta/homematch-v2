'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { AvatarData, getAvatarSrc } from '@/lib/constants/avatars'

export interface UserAvatarProps {
  /** User's display name for generating initials */
  displayName?: string | null
  /** User's email for fallback initials */
  email?: string | null
  /** Avatar data from user preferences */
  avatar?: AvatarData | null
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Additional class names */
  className?: string
  /** Show a badge overlay (e.g., household indicator) */
  badge?: React.ReactNode
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 sm:h-24 sm:w-24 text-xl sm:text-2xl',
}

const badgeSizeClasses = {
  xs: 'h-3 w-3 -right-0.5 -bottom-0.5',
  sm: 'h-4 w-4 -right-0.5 -bottom-0.5',
  md: 'h-5 w-5 -right-1 -bottom-1',
  lg: 'h-6 w-6 -right-1 -bottom-1',
  xl: 'h-7 w-7 -right-1 -bottom-1',
}

/**
 * Generate initials from display name or email
 */
function getInitials(
  displayName?: string | null,
  email?: string | null
): string {
  const name = displayName || email?.split('@')[0] || ''
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Reusable user avatar component that displays:
 * - Custom uploaded image
 * - Preset animal avatar
 * - Fallback initials in gradient box (matches current design)
 */
export function UserAvatar({
  displayName,
  email,
  avatar,
  size = 'md',
  className,
  badge,
}: UserAvatarProps) {
  const avatarSrc = getAvatarSrc(avatar)
  const initials = getInitials(displayName, email)
  const sizeClass = sizeClasses[size]
  const badgeSizeClass = badgeSizeClasses[size]

  // Use square rounded style for xl size to match current profile design
  const isXl = size === 'xl'
  const isLarge = size === 'lg' || size === 'xl'

  return (
    <div className="relative inline-block">
      <Avatar
        className={cn(
          sizeClass,
          isXl ? 'rounded-2xl' : 'rounded-full',
          // Add subtle ring for larger sizes
          isLarge && 'ring-1 ring-white/10',
          className
        )}
      >
        {avatarSrc && (
          <AvatarImage
            src={avatarSrc}
            alt={displayName || 'User avatar'}
            className={cn('object-cover', isXl && 'rounded-2xl')}
          />
        )}
        <AvatarFallback
          className={cn(
            'flex items-center justify-center font-semibold tracking-wide',
            // Refined gradient with more depth
            'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900',
            'text-white/90',
            // Subtle inner shadow for depth
            'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_0_0_rgba(0,0,0,0.2)]',
            isXl ? 'rounded-2xl' : 'rounded-full'
          )}
        >
          {initials || '?'}
        </AvatarFallback>
      </Avatar>

      {badge && (
        <div
          className={cn(
            'absolute flex items-center justify-center',
            'rounded-full border-2 border-[#0a1628]',
            'bg-gradient-to-br from-emerald-400 to-emerald-500',
            'shadow-lg shadow-emerald-500/30',
            badgeSizeClass
          )}
        >
          {badge}
        </div>
      )}
    </div>
  )
}
