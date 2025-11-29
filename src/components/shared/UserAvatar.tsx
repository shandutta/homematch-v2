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
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 sm:h-24 sm:w-24 text-2xl sm:text-3xl',
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

  return (
    <div className="relative inline-block">
      <Avatar
        className={cn(
          sizeClass,
          isXl ? 'rounded-2xl' : 'rounded-full',
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
            'flex items-center justify-center font-medium',
            'border border-white/10 bg-gradient-to-br from-white/10 to-white/5',
            'text-hm-stone-200 shadow-xl shadow-black/20 backdrop-blur-sm',
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
            'rounded-full border-2 border-[#0c0a09]',
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
