'use client'

import { Heart, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MotionDiv } from '@/components/ui/motion-components'

interface MutualLikesBadgeProps {
  likedByCount: number
  showAnimation?: boolean
  variant?: 'default' | 'compact' | 'large'
}

export function MutualLikesBadge({
  likedByCount,
  showAnimation = true,
  variant = 'default',
}: MutualLikesBadgeProps) {
  if (likedByCount < 2) return null

  const sizeClasses = {
    compact: 'text-xs p-1',
    default: 'text-sm p-2',
    large: 'text-base p-4',
  }

  const iconSizes = {
    compact: 'h-3 w-3',
    default: 'h-4 w-4',
    large: 'h-5 w-5',
  }

  const BadgeContent = () => (
    <Badge
      className={`border-hm-gold-200 bg-hm-gold-50 text-hm-stone-800 border shadow-sm ${sizeClasses[variant]} `}
      data-testid="mutual-likes-badge"
    >
      <div className="flex items-center gap-1">
        <div className="relative">
          <Heart
            className={`${iconSizes[variant]} fill-hm-gold-500 text-hm-gold-500`}
          />
          {likedByCount > 2 && (
            <span className="bg-hm-gold-300 text-hm-stone-900 absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full text-xs font-bold">
              {likedByCount}
            </span>
          )}
        </div>
        <span className="text-hm-stone-800 font-medium">Both liked!</span>
        <Users className={`${iconSizes[variant]} text-hm-gold-600`} />
      </div>
    </Badge>
  )

  if (!showAnimation) {
    return <BadgeContent />
  }

  return (
    <MotionDiv
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 0.1,
      }}
      whileHover={{ scale: 1.05 }}
      className="inline-block"
    >
      <BadgeContent />
    </MotionDiv>
  )
}

interface MutualLikesIndicatorProps {
  propertyId?: string | null
  mutualLikes?: Array<{
    property_id?: string | null
    liked_by_count: number
  }>
  variant?: 'default' | 'compact' | 'large'
}

export function MutualLikesIndicator({
  propertyId,
  mutualLikes,
  variant = 'default',
}: MutualLikesIndicatorProps) {
  if (!propertyId) return null
  const mutualLike = (mutualLikes ?? []).find(
    (ml) => ml.property_id === propertyId
  )

  if (!mutualLike) return null

  return (
    <MutualLikesBadge
      likedByCount={mutualLike.liked_by_count}
      variant={variant}
    />
  )
}
