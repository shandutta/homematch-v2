'use client'

import {
  Heart,
  Eye,
  X,
  Search,
  Activity as ActivityIcon,
  TrendingUp,
  Sparkles,
  Target,
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'

interface ActivityStatsProps {
  summary: {
    likes: number
    dislikes: number
    views: number
    saved_searches: number
    total_interactions: number
  }
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
    },
  },
}

export function ActivityStats({ summary }: ActivityStatsProps) {
  const engagementRate =
    summary.views > 0 ? Math.round((summary.likes / summary.views) * 100) : 0

  const stats = [
    {
      label: 'Properties Viewed',
      value: summary.views,
      icon: Eye,
      gradient: 'from-amber-500/20 to-amber-600/5',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      valueColor: 'text-amber-300',
    },
    {
      label: 'Properties Liked',
      value: summary.likes,
      icon: Heart,
      gradient: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-300',
    },
    {
      label: 'Properties Passed',
      value: summary.dislikes,
      icon: X,
      gradient: 'from-rose-500/20 to-rose-600/5',
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-400',
      valueColor: 'text-rose-300',
    },
    {
      label: 'Saved Searches',
      value: summary.saved_searches,
      icon: Search,
      gradient: 'from-sky-500/20 to-sky-600/5',
      iconBg: 'bg-sky-500/10',
      iconColor: 'text-sky-400',
      valueColor: 'text-sky-300',
    },
  ]

  const getInsight = () => {
    if (summary.likes > summary.dislikes) {
      return {
        icon: Sparkles,
        title: 'Great taste!',
        description: "You've liked more properties than you've passed on.",
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
      }
    } else if (summary.likes === summary.dislikes) {
      return {
        icon: Target,
        title: 'Balanced approach!',
        description:
          "You've liked and passed on an equal number of properties.",
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/20',
      }
    } else {
      return {
        icon: Target,
        title: 'Selective buyer!',
        description: "You're being careful about which properties you like.",
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
      }
    }
  }

  const insight = getInsight()

  return (
    <div className="space-y-6">
      {/* Activity Overview Card */}
      <div className="card-luxury overflow-hidden p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
            <ActivityIcon className="text-hm-stone-400 h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
              Activity Overview
            </h2>
            <p className="text-hm-stone-500 text-sm">
              Your property search statistics
            </p>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className={`group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br ${stat.gradient} p-4 backdrop-blur-sm transition-all hover:border-white/10`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-hm-stone-500 text-xs font-medium tracking-[0.1em] uppercase">
                      {stat.label.split(' ')[0]}
                    </p>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.iconBg}`}
                    >
                      <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <p
                    className={`font-display mt-3 text-3xl font-medium tracking-tight ${stat.valueColor}`}
                  >
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-hm-stone-500 mt-1 text-xs">
                    {stat.label.split(' ')[1]}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Summary row */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-hm-stone-500 text-xs font-medium tracking-[0.15em] uppercase">
                  Total Interactions
                </p>
                <p className="font-display text-hm-stone-200 mt-1 text-2xl font-medium">
                  {summary.total_interactions.toLocaleString()}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                <ActivityIcon className="text-hm-stone-400 h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-hm-stone-500 text-xs font-medium tracking-[0.15em] uppercase">
                  Engagement Rate
                </p>
                <p className="font-display text-hm-stone-200 mt-1 text-2xl font-medium">
                  {engagementRate}%
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                <TrendingUp className="text-hm-stone-400 h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(engagementRate, 100)}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                />
              </div>
              <p className="text-hm-stone-500 mt-2 text-xs">
                Percentage of viewed properties you liked
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-luxury overflow-hidden p-6 sm:p-8"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
            <Sparkles className="text-hm-stone-400 h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
              Insights
            </h2>
            <p className="text-hm-stone-500 text-sm">
              Understanding your preferences
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {/* Main insight */}
          <div
            className={`flex items-start gap-4 rounded-xl border ${insight.border} ${insight.bg} p-4`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${insight.bg}`}
            >
              <insight.icon className={`h-5 w-5 ${insight.color}`} />
            </div>
            <div>
              <p className={`font-medium ${insight.color}`}>{insight.title}</p>
              <p className="text-hm-stone-400 mt-1 text-sm">
                {insight.description}
              </p>
            </div>
          </div>

          {/* Saved searches insight */}
          {summary.saved_searches > 0 && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
                  <Search className="h-4 w-4 text-sky-400" />
                </div>
                <p className="text-hm-stone-400 text-sm">
                  You have{' '}
                  <span className="font-medium text-sky-300">
                    {summary.saved_searches} saved{' '}
                    {summary.saved_searches === 1 ? 'search' : 'searches'}
                  </span>{' '}
                  to help you find your perfect home.
                </p>
              </div>
            </div>
          )}

          {/* Tip */}
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
            <p className="text-hm-stone-500 text-xs">
              <span className="text-hm-stone-400 font-medium">Pro tip:</span>{' '}
              Properties you like appear in your Favorites. Share your household
              code with your partner to discover mutual likes together.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
