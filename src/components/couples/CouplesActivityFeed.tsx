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
import { MotionDiv, slideInRight, scaleIn, normalTransition } from '@/components/ui/motion-components'
import { formatPrice } from '@/lib/utils/formatting'
import { formatDistanceToNow } from 'date-fns'
import type { HouseholdActivity } from '@/lib/services/couples'

interface CouplesActivityFeedProps {
  activity: HouseholdActivity[]
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

export function CouplesActivityFeed({ activity }: CouplesActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <Card className="card-glassmorphism-style border-couples-secondary/20">
        <CardHeader>
          <CardTitle className="text-primary-foreground flex items-center gap-2 text-xl">
            <Activity className="h-6 w-6 text-couples-secondary" />
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
                <Activity className="h-16 w-16 text-couples-secondary/30" />
              </MotionDiv>
            </div>
            <h3 className="text-primary-foreground mb-2 text-xl font-semibold">
              No activity yet!
            </h3>
            <p className="text-primary/60 mb-4">
              Start exploring properties to see your household activity here
            </p>
            <Button
              asChild
              className="bg-gradient-couples-mutual hover:opacity-80"
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
    <Card className="card-glassmorphism-style border-purple-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary-foreground flex items-center gap-2 text-xl">
            <Activity className="h-6 w-6 text-purple-400" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/dashboard/activity"
              className="text-purple-400 hover:text-purple-300"
            >
              View all activity
            </Link>
          </Button>
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
              <Link href={`/properties/${item.property_id}`}>
                <div className="group relative rounded-lg border border-white/5 bg-white/5 p-3 transition-all hover:border-purple-400/30 hover:bg-white/10">
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
                            <User className="text-primary/40 h-3 w-3" />
                            <span className="text-primary-foreground truncate text-xs font-medium">
                              {item.user_display_name || 'Someone'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Icon
                              className={`h-3 w-3 ${colorClass} ${item.interaction_type === 'like' ? 'fill-current' : ''}`}
                            />
                            <span className="text-primary/60 text-xs">
                              {actionText}
                            </span>
                          </div>

                          {item.is_mutual && (
                            <MotionDiv
                              variants={scaleIn}
                              initial="initial"
                              animate="animate"
                              transition={normalTransition}
                              className="flex items-center gap-1 rounded-full bg-gradient-couples-mutual px-2 py-0.5"
                            >
                              <Sparkles className="h-3 w-3 text-couples-primary" />
                              <span className="text-xs font-semibold text-couples-primary">
                                Mutual!
                              </span>
                            </MotionDiv>
                          )}
                        </div>

                        <div className="text-primary/40 flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(item.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>

                      <p className="text-primary-foreground mb-1 truncate text-sm font-medium">
                        {item.property_address}
                      </p>

                      <div className="text-primary/60 flex items-center gap-3 text-xs">
                        <span className="font-semibold text-green-400">
                          {formatPrice(item.property_price)}
                        </span>
                        <span>{item.property_bedrooms} bed</span>
                        <span>{item.property_bathrooms} bath</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute top-1/2 right-3 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="h-2 w-2 rounded-full bg-purple-400" />
                  </div>
                </div>
              </Link>
            </MotionDiv>
          )
        })}

        <div className="pt-4 text-center">
          <Button
            variant="outline"
            asChild
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <Link href="/dashboard/activity">
              View Full Activity History
              <Activity className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
