'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Heart,
  Users,
  Flame,
  Calendar,
  TrendingUp,
  Award,
  Sparkles,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  MotionDiv,
  scaleIn,
  slideInRight,
  normalTransition,
} from '@/components/ui/motion-components'
import type { CouplesStats as CouplesStatsType } from '@/lib/services/couples'

interface CouplesStatsProps {
  stats: CouplesStatsType | null
}

export function CouplesStats({ stats }: CouplesStatsProps) {
  if (!stats) {
    return (
      <Card className="card-glassmorphism-style border-hm-stone-600/60">
        <CardHeader>
          <CardTitle className="text-hm-stone-200 flex items-center gap-2 text-xl">
            <TrendingUp className="text-couples-accent h-6 w-6" />
            Household signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <TrendingUp className="text-couples-accent/30 mx-auto mb-4 h-12 w-12" />
            <p className="text-hm-stone-500">
              Start saving homes to build household signal.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const matchRate =
    stats.total_household_likes > 0
      ? Math.round(
          (stats.total_mutual_likes / stats.total_household_likes) * 100
        )
      : 0

  return (
    <div className="space-y-6">
      {/* Main Stats Card */}
      <Card className="card-glassmorphism-style border-hm-stone-600/60">
        <CardHeader>
          <CardTitle className="text-hm-stone-200 flex items-center gap-2 text-xl">
            <TrendingUp className="text-couples-accent h-6 w-6" />
            Household signals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Shared likes */}
          <MotionDiv
            className="border-hm-stone-600/60 bg-hm-obsidian-950/70 rounded-lg border p-4 text-center"
            variants={scaleIn}
            initial="initial"
            animate="animate"
            transition={{ ...normalTransition, delay: 0.1 }}
          >
            <div className="mb-2 flex items-center justify-center gap-2">
              <Heart className="h-6 w-6 fill-pink-400 text-pink-400" />
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-hm-stone-200 mb-1 text-3xl font-bold">
              {stats.total_mutual_likes}
            </div>
            <div className="text-hm-stone-500 text-sm">Shared likes</div>
          </MotionDiv>

          {/* Total Household Likes */}
          <div className="border-hm-stone-600/60 bg-hm-obsidian-950/70 flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <div className="text-hm-stone-200 font-semibold">
                  {stats.total_household_likes}
                </div>
                <div className="text-hm-stone-500 text-xs">Total saves</div>
              </div>
            </div>
          </div>

          {/* Overlap rate */}
          <div className="border-hm-stone-600/60 bg-hm-obsidian-950/70 flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                <Award className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <div className="text-hm-stone-200 font-semibold">
                  {matchRate}%
                </div>
                <div className="text-hm-stone-500 text-xs">Overlap rate</div>
              </div>
            </div>
          </div>

          {/* Activity Streak */}
          {stats.activity_streak_days > 0 && (
            <MotionDiv
              className="bg-hm-obsidian-950/70 flex items-center justify-between rounded-lg border border-orange-500/20 p-3"
              variants={slideInRight}
              initial="initial"
              animate="animate"
              transition={{ ...normalTransition, delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20">
                  <MotionDiv
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Flame className="h-5 w-5 text-orange-400" />
                  </MotionDiv>
                </div>
                <div>
                  <div className="text-hm-stone-200 font-semibold">
                    {stats.activity_streak_days} days
                  </div>
                  <div className="text-hm-stone-500 text-xs">Active streak</div>
                </div>
              </div>
              {stats.activity_streak_days >= 7 && (
                <Sparkles className="h-5 w-5 text-yellow-400" />
              )}
            </MotionDiv>
          )}
        </CardContent>
      </Card>

      {/* Last Mutual Like */}
      {stats.last_mutual_like_at && (
        <Card className="card-glassmorphism-style border-hm-stone-600/60">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4 text-pink-400" />
                <span className="text-hm-stone-200 text-sm font-medium">
                  Last Mutual Like
                </span>
              </div>
              <div className="text-hm-stone-500 text-xs">
                {formatDistanceToNow(new Date(stats.last_mutual_like_at), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements Section */}
      <Card className="card-glassmorphism-style border-hm-stone-600/60">
        <CardHeader>
          <CardTitle className="text-hm-stone-200 flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-yellow-400" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* First Mutual Like Achievement */}
          <div
            className={`flex items-center gap-3 rounded p-2 ${stats.total_mutual_likes > 0 ? 'bg-green-500/10' : 'bg-gray-500/10'}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${stats.total_mutual_likes > 0 ? 'bg-green-500/20' : 'bg-gray-500/20'}`}
            >
              <Heart
                className={`h-4 w-4 ${stats.total_mutual_likes > 0 ? 'fill-current text-green-400' : 'text-gray-400'}`}
              />
            </div>
            <div>
              <div
                className={`text-sm font-medium ${stats.total_mutual_likes > 0 ? 'text-hm-stone-200' : 'text-hm-stone-500'}`}
              >
                First shared like
              </div>
              <div className="text-hm-stone-500 text-xs">
                {stats.total_mutual_likes > 0
                  ? 'Reached'
                  : 'Get your first mutual like'}
              </div>
            </div>
          </div>

          {/* High Overlap rate Achievement */}
          <div
            className={`flex items-center gap-3 rounded p-2 ${matchRate >= 50 ? 'bg-purple-500/10' : 'bg-gray-500/10'}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${matchRate >= 50 ? 'bg-purple-500/20' : 'bg-gray-500/20'}`}
            >
              <TrendingUp
                className={`h-4 w-4 ${matchRate >= 50 ? 'text-purple-400' : 'text-gray-400'}`}
              />
            </div>
            <div>
              <div
                className={`text-sm font-medium ${matchRate >= 50 ? 'text-hm-stone-200' : 'text-hm-stone-500'}`}
              >
                High overlap
              </div>
              <div className="text-hm-stone-500 text-xs">
                {matchRate >= 50 ? 'Reached' : 'Achieve 50%+ match rate'}
              </div>
            </div>
          </div>

          {/* Streak Achievement */}
          <div
            className={`flex items-center gap-3 rounded p-2 ${stats.activity_streak_days >= 7 ? 'bg-orange-500/10' : 'bg-gray-500/10'}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${stats.activity_streak_days >= 7 ? 'bg-orange-500/20' : 'bg-gray-500/20'}`}
            >
              <Flame
                className={`h-4 w-4 ${stats.activity_streak_days >= 7 ? 'text-orange-400' : 'text-gray-400'}`}
              />
            </div>
            <div>
              <div
                className={`text-sm font-medium ${stats.activity_streak_days >= 7 ? 'text-hm-stone-200' : 'text-hm-stone-500'}`}
              >
                Consistent activity
              </div>
              <div className="text-hm-stone-500 text-xs">
                {stats.activity_streak_days >= 7
                  ? 'Reached'
                  : '7-day activity streak'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
