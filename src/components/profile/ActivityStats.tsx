'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Eye, X, Search, Activity as ActivityIcon } from 'lucide-react'

interface ActivityStatsProps {
  summary: {
    likes: number
    dislikes: number
    views: number
    saved_searches: number
    total_interactions: number
  }
}

export function ActivityStats({ summary }: ActivityStatsProps) {
  const stats = [
    {
      label: 'Properties Viewed',
      value: summary.views,
      icon: Eye,
      colorClass: 'text-token-info',
      bgClass: 'bg-token-info-light',
    },
    {
      label: 'Properties Liked',
      value: summary.likes,
      icon: Heart,
      colorClass: 'text-token-success',
      bgClass: 'bg-token-success-light',
    },
    {
      label: 'Properties Passed',
      value: summary.dislikes,
      icon: X,
      colorClass: 'text-token-error',
      bgClass: 'bg-token-error-light',
    },
    {
      label: 'Saved Searches',
      value: summary.saved_searches,
      icon: Search,
      colorClass: 'text-token-primary',
      bgClass: 'bg-token-primary-light',
    },
  ]

  return (
    <div className="space-y-6">
      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-primary-foreground flex items-center gap-2 text-2xl">
            <ActivityIcon className="h-6 w-6" />
            Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border-primary/20 bg-background/5 rounded-lg border p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-primary/40 text-sm">{stat.label}</p>
                  <div className={`rounded-lg p-2 ${stat.bgClass}`}>
                    <stat.icon className={`h-5 w-5 ${stat.colorClass}`} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${stat.colorClass}`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="border-primary/20 bg-primary/10 mt-6 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary/40 text-sm">Total Interactions</p>
                <p className="text-primary-foreground text-2xl font-bold">
                  {summary.total_interactions.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-primary/40 text-sm">Engagement Rate</p>
                <p className="text-primary/80 text-2xl font-bold">
                  {summary.views > 0
                    ? `${Math.round((summary.likes / summary.views) * 100)}%`
                    : '0%'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-primary-foreground text-xl">
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-primary/40">
              {summary.likes > summary.dislikes ? (
                <>
                  <span className="font-semibold text-green-400">
                    Great taste!
                  </span>{' '}
                  You&apos;ve liked more properties than you&apos;ve passed on.
                </>
              ) : summary.likes === summary.dislikes ? (
                <>
                  <span className="font-semibold text-blue-400">
                    Balanced approach!
                  </span>{' '}
                  You&apos;ve liked and passed on an equal number of properties.
                </>
              ) : (
                <>
                  <span className="font-semibold text-yellow-400">
                    Selective buyer!
                  </span>{' '}
                  You&apos;re being careful about which properties you like.
                </>
              )}
            </p>
            {summary.saved_searches > 0 && (
              <p className="text-primary/40">
                You have{' '}
                <span className="text-primary/80 font-semibold">
                  {summary.saved_searches} saved{' '}
                  {summary.saved_searches === 1 ? 'search' : 'searches'}
                </span>{' '}
                to help you find your perfect home.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
