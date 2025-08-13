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
    compact: 'text-token-xs p-token-xs',
    default: 'text-token-sm p-token-sm',
    large: 'text-token-base p-token-md',
  }

  const iconSizes = {
    compact: 'h-3 w-3',
    default: 'h-4 w-4',
    large: 'h-5 w-5',
  }

  const BadgeContent = () => (
    <Badge
      className={`bg-gradient-mutual-likes backdrop-blur-sm ${sizeClasses[variant]} `}
      data-testid="mutual-likes-badge"
    >
      <div className="gap-token-xs flex items-center">
        <div className="relative">
          <Heart
            className={`${iconSizes[variant]} fill-pink-400 text-pink-400`}
          />
          {likedByCount > 2 && (
            <span className="text-token-xs absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-purple-500 font-bold text-white">
              {likedByCount}
            </span>
          )}
        </div>
        <span className="font-medium text-pink-300">Both liked!</span>
        <Users className={`${iconSizes[variant]} text-purple-400`} />
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
  propertyId: string
  mutualLikes: Array<{
    property_id: string
    liked_by_count: number
  }>
  variant?: 'default' | 'compact' | 'large'
}

export function MutualLikesIndicator({
  propertyId,
  mutualLikes,
  variant = 'default',
}: MutualLikesIndicatorProps) {
  const mutualLike = mutualLikes.find((ml) => ml.property_id === propertyId)

  if (!mutualLike) return null

  return (
    <MutualLikesBadge
      likedByCount={mutualLike.liked_by_count}
      variant={variant}
    />
  )
}
