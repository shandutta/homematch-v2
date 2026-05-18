'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Activity,
  Heart,
  X,
  Eye,
  SkipForward,
  User,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PropertyImage } from '@/components/ui/property-image'
import {
  MotionDiv,
  slideInRight,
  scaleIn,
  normalTransition,
} from '@/components/ui/motion-components'
import { formatPrice } from '@/lib/utils/formatting'
import { formatDistanceToNow } from 'date-fns'
import type { HouseholdActivity } from '@/lib/services/couples'

interface CouplesActivityFeedProps {
  activity: HouseholdActivity[]
  showViewAllLink?: boolean
  returnToPath?: string
}

const interactionIcons = {
  like: Heart,
  dislike: X,
  skip: SkipForward,
  view: Eye,
}

const interactionColors = {
  like: 'text-couples-primary',
  dislike: 'text-couples-accent',
  skip: 'text-couples-warning',
  view: 'text-couples-info',
}

const interactionText = {
  like: 'liked',
  dislike: 'passed on',
  skip: 'skipped',
  view: 'viewed',
}

export function CouplesActivityFeed({
  activity,
  showViewAllLink = true,
  returnToPath = '/couples',
}: CouplesActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <Card className="card-glassmorphism-style border-hm-border/60">
        <CardHeader>
          <CardTitle className="text-hm-ink flex items-center gap-2 text-xl">
            <Activity className="text-couples-secondary h-6 w-6" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <div className="mb-6 flex justify-center">
              <MotionDiv
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Activity className="text-couples-secondary/30 h-16 w-16" />
              </MotionDiv>
            </div>
            <h3 className="text-hm-ink mb-2 text-xl font-semibold">
              No activity yet!
            </h3>
            <p className="text-hm-muted mb-4">
              Start exploring properties to see your household activity here
            </p>
            <Button
              asChild
              className="bg-hm-accent hover:bg-hm-accent-strong text-white"
            >
              <Link href="/dashboard">
                Start Exploring
                <Activity className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="card-glassmorphism-style border-hm-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-hm-ink flex items-center gap-2 text-xl">
            <Activity className="text-couples-secondary h-6 w-6" />
            Recent Activity
          </CardTitle>
          {showViewAllLink && (
            <Button variant="ghost" size="sm" asChild>
              <Link
                href="/dashboard/activity"
                className="text-hm-link hover:text-hm-link-hover"
              >
                View all activity
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activity.map((item, index) => {
          const Icon = interactionIcons[item.interaction_type]
          const colorClass = interactionColors[item.interaction_type]
          const actionText = interactionText[item.interaction_type]

          return (
            <MotionDiv
              key={item.id}
              variants={slideInRight}
              initial="initial"
              animate="animate"
              transition={{ ...normalTransition, delay: index * 0.05 }}
            >
              <Link
                href={`/properties/${item.property_id}?returnTo=${encodeURIComponent(returnToPath)}`}
              >
                <div className="group border-hm-border/60 bg-hm-canvas/70 hover:border-hm-accent/25 hover:bg-hm-surface relative rounded-lg border p-3 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md">
                      <PropertyImage
                        src={item.property_images}
                        alt={item.property_address}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <div className="flex items-center gap-1">
                            <User className="text-hm-muted h-3 w-3" />
                            <span className="text-hm-ink truncate text-xs font-medium">
                              {item.user_display_name || 'Someone'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Icon
                              className={`h-3 w-3 ${colorClass} ${item.interaction_type === 'like' ? 'fill-current' : ''}`}
                            />
                            <span className="text-hm-muted text-xs">
                              {actionText}
                            </span>
                          </div>

                          {item.is_mutual && (
                            <MotionDiv
                              variants={scaleIn}
                              initial="initial"
                              animate="animate"
                              transition={normalTransition}
                              className="border-hm-accent/20 bg-hm-border flex items-center gap-1 rounded-full border px-2 py-0.5"
                            >
                              <Sparkles className="text-couples-primary h-3 w-3" />
                              <span className="text-couples-primary text-xs font-semibold">
                                Shared like
                              </span>
                            </MotionDiv>
                          )}
                        </div>

                        <div className="text-hm-muted flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(item.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      <p className="text-hm-ink mb-1 truncate text-sm font-medium">
                        {item.property_address}
                      </p>

                      <div className="text-hm-muted flex items-center gap-3 text-xs">
                        <span className="text-hm-success font-semibold">
                          {formatPrice(item.property_price)}
                        </span>
                        <span>{item.property_bedrooms} bed</span>
                        <span>{item.property_bathrooms} bath</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute top-1/2 right-3 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="bg-hm-accent h-2 w-2 rounded-full" />
                  </div>
                </div>
              </Link>
            </MotionDiv>
          )
        })}

        {showViewAllLink && (
          <div className="pt-4 text-center">
            <Button
              variant="outline"
              asChild
              className="border-hm-border/70 text-hm-ink-soft hover:bg-hm-border hover:text-hm-ink"
            >
              <Link href="/dashboard/activity">
                View Full Activity History
                <Activity className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
