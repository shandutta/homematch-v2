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
      colorClass: 'text-blue-400',
      bgClass: 'bg-blue-500/10',
    },
    {
      label: 'Properties Liked',
      value: summary.likes,
      icon: Heart,
      colorClass: 'text-green-400',
      bgClass: 'bg-green-500/10',
    },
    {
      label: 'Properties Passed',
      value: summary.dislikes,
      icon: X,
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/10',
    },
    {
      label: 'Saved Searches',
      value: summary.saved_searches,
      icon: Search,
      colorClass: 'text-purple-400',
      bgClass: 'bg-purple-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      <Card className="card-glassmorphism-style">
        <CardHeader>
          <CardTitle className="text-2xl text-white flex items-center gap-2">
            <ActivityIcon className="h-6 w-6" />
            Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-lg border border-purple-500/20 bg-white/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-purple-200">{stat.label}</p>
                  <div className={`p-2 rounded-lg ${stat.bgClass}`}>
                    <stat.icon className={`h-5 w-5 ${stat.colorClass}`} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${stat.colorClass}`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg border border-purple-500/20 bg-purple-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-200">Total Interactions</p>
                <p className="text-2xl font-bold text-white">
                  {summary.total_interactions.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-200">Engagement Rate</p>
                <p className="text-2xl font-bold text-purple-400">
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
          <CardTitle className="text-xl text-white">Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-purple-200">
              {summary.likes > summary.dislikes ? (
                <>
                  <span className="text-green-400 font-semibold">Great taste!</span> You&apos;ve
                  liked more properties than you&apos;ve passed on.
                </>
              ) : summary.likes === summary.dislikes ? (
                <>
                  <span className="text-blue-400 font-semibold">Balanced approach!</span>{' '}
                  You&apos;ve liked and passed on an equal number of properties.
                </>
              ) : (
                <>
                  <span className="text-yellow-400 font-semibold">Selective buyer!</span>{' '}
                  You&apos;re being careful about which properties you like.
                </>
              )}
            </p>
            {summary.saved_searches > 0 && (
              <p className="text-purple-200">
                You have{' '}
                <span className="text-purple-400 font-semibold">
                  {summary.saved_searches} saved {summary.saved_searches === 1 ? 'search' : 'searches'}
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