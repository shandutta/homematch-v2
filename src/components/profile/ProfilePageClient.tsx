'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, Household } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from './ProfileForm'
import { HouseholdSection } from './HouseholdSection'
import { ActivityStats } from './ActivityStats'
import {
  User as UserIcon,
  Home,
  Activity,
  ArrowLeft,
  Mail,
  Users,
  Heart,
  Eye,
  Search,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { AvatarData } from '@/lib/constants/avatars'
import { MobileBottomNav } from '@/components/layouts/MobileBottomNav'

interface ProfilePageClientProps {
  user: User
  profile: UserProfile & { household?: Household | null }
  activitySummary: {
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
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
}

const statVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isAvatarData = (value: unknown): value is AvatarData =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  (value.type === 'preset' || value.type === 'custom') &&
  'value' in value &&
  typeof value.value === 'string'

export function ProfilePageClient({
  user,
  profile,
  activitySummary,
}: ProfilePageClientProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [codeCopied, setCodeCopied] = useState(false)

  const preferenceRecord = isRecord(profile.preferences)
    ? profile.preferences
    : {}
  const avatar = isAvatarData(preferenceRecord.avatar)
    ? preferenceRecord.avatar
    : null
  const displayName =
    (typeof preferenceRecord.display_name === 'string'
      ? preferenceRecord.display_name
      : undefined) ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Your Profile'
  const hasHousehold = Boolean(profile.household)

  const heroStats = [
    {
      label: 'Liked',
      value: activitySummary.likes,
      icon: Heart,
      gradient: 'from-emerald-500/20 to-emerald-600/5',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-300',
      href: '/dashboard/liked',
    },
    {
      label: 'Viewed',
      value: activitySummary.views,
      icon: Eye,
      gradient: 'from-amber-500/20 to-amber-600/5',
      iconColor: 'text-amber-400',
      valueColor: 'text-amber-300',
      href: '/dashboard/viewed',
    },
    {
      label: 'Saved searches',
      value: activitySummary.saved_searches,
      icon: Search,
      gradient: 'from-sky-500/20 to-sky-600/5',
      iconColor: 'text-sky-400',
      valueColor: 'text-sky-300',
      href: '/settings?tab=saved-searches',
    },
  ]

  const copyHouseholdCode = async () => {
    if (profile.household?.id) {
      await navigator.clipboard.writeText(profile.household.id)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  return (
    <div className="gradient-grid-bg min-h-screen pb-6 text-white">
      {/* Hero Header */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative isolate overflow-hidden border-b border-white/5"
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-amber-500/[0.03] blur-[100px]" />
          <div className="absolute -top-20 right-1/4 h-[400px] w-[400px] rounded-full bg-sky-500/[0.04] blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Back navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Link
              href="/dashboard"
              className="group text-hm-stone-400 hover:text-hm-stone-200 inline-flex items-center gap-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Dashboard</span>
            </Link>
          </motion.div>

          {/* Profile header */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between"
          >
            {/* Left: Avatar and info */}
            <motion.div variants={itemVariants} className="flex flex-col gap-6">
              <div className="flex items-start gap-5">
                {/* Avatar */}
                <UserAvatar
                  displayName={displayName}
                  email={user.email}
                  avatar={avatar}
                  size="xl"
                  badge={
                    hasHousehold ? (
                      <Users className="h-3.5 w-3.5 text-white" />
                    ) : undefined
                  }
                />

                {/* Name and meta */}
                <div className="flex-1 pt-1">
                  <p className="text-hm-stone-500 text-xs font-medium tracking-[0.2em] uppercase">
                    My Profile
                  </p>
                  <h1 className="font-heading text-hm-stone-200 mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {displayName}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-hm-stone-400 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                        hasHousehold
                          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'text-hm-stone-400 border border-white/10 bg-white/5'
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      {hasHousehold ? 'Household synced' : 'Solo mode'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-hm-stone-400 max-w-xl text-sm leading-relaxed">
                Manage your profile, household settings, and track your property
                search activity all in one place.
              </p>
            </motion.div>

            {/* Right: Action buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-3"
            >
              <Link href="/settings">
                <Button
                  variant="outline"
                  className="text-hm-stone-300 border-white/10 bg-white/5 px-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  Settings
                </Button>
              </Link>
              <Link href="/dashboard/liked">
                <Button className="border border-emerald-500/25 bg-gradient-to-r from-emerald-500/30 to-emerald-600/20 px-5 text-emerald-100 shadow-md shadow-emerald-900/25 backdrop-blur-sm transition-all hover:border-emerald-400/40 hover:from-emerald-500/35 hover:to-emerald-600/25 hover:shadow-emerald-900/35">
                  <Heart className="mr-2 h-4 w-4 text-emerald-200" />
                  View Favorites
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-10 grid gap-4 sm:grid-cols-3"
          >
            {heroStats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="group block rounded-2xl focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black/0 focus-visible:outline-none"
                  aria-label={`${stat.label} details`}
                >
                  <motion.div
                    variants={statVariants}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br ${stat.gradient} p-5 backdrop-blur-sm transition-all hover:border-white/10`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative flex items-center justify-between">
                      <div>
                        <p className="text-hm-stone-500 text-xs font-medium tracking-[0.15em] uppercase">
                          {stat.label}
                        </p>
                        <p
                          className={`font-display mt-2 text-4xl font-medium tracking-tight ${stat.valueColor}`}
                        >
                          {stat.value.toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ${stat.iconColor}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </motion.div>
        </div>
      </motion.section>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[340px,1fr]">
          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-6"
          >
            {/* Collaboration card */}
            <div className="card-luxury overflow-hidden p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                  <Users className="text-hm-stone-400 h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-hm-stone-200 font-medium">
                    Collaboration
                  </h3>
                  <p className="text-hm-stone-500 text-xs">Household status</p>
                </div>
              </div>

              <div className="mt-6">
                {hasHousehold ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-400" />
                        <p className="text-xs font-medium tracking-wide text-emerald-300 uppercase">
                          Active Household
                        </p>
                      </div>
                      <p className="text-hm-stone-200 mt-2 text-lg font-medium">
                        {profile.household?.name}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <p className="text-hm-stone-500 text-[10px] font-medium tracking-[0.15em] uppercase">
                        Join Code
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-hm-stone-400 flex-1 truncate rounded bg-white/5 px-2 py-1 font-mono text-xs">
                          {profile.household?.id}
                        </code>
                        <button
                          onClick={copyHouseholdCode}
                          className="text-hm-stone-400 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                        >
                          <AnimatePresence mode="wait">
                            {codeCopied ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="copy"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
                    <Users className="text-hm-stone-500 mx-auto h-8 w-8" />
                    <p className="text-hm-stone-400 mt-2 text-sm">
                      Create or join a household to discover mutual likes and
                      collaborate on your home search.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('household')}
                  className="text-hm-stone-300 border-white/10 bg-white/5 text-xs transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <Home className="mr-1.5 h-3.5 w-3.5" />
                  Household
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('activity')}
                  className="text-hm-stone-300 border-white/10 bg-white/5 text-xs transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <Activity className="mr-1.5 h-3.5 w-3.5" />
                  Activity
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Main content area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="inline-flex h-auto w-full gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 backdrop-blur-sm sm:w-auto">
                {[
                  { value: 'profile', label: 'Profile', icon: UserIcon },
                  { value: 'household', label: 'Household', icon: Home },
                  { value: 'activity', label: 'Activity', icon: Activity },
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="text-hm-stone-400 relative flex-1 rounded-lg px-4 py-2.5 text-sm transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg sm:flex-none sm:px-6"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {tab.label}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              <div className="space-y-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'profile' && (
                    <TabsContent
                      key="profile"
                      value="profile"
                      className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="card-luxury overflow-hidden p-6 sm:p-8"
                      >
                        <div className="mb-6 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                            <UserIcon className="text-hm-stone-400 h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="font-heading text-hm-stone-200 text-xl font-semibold">
                              Profile Information
                            </h2>
                            <p className="text-hm-stone-500 text-sm">
                              Update your personal details
                            </p>
                          </div>
                        </div>
                        <ProfileForm user={user} profile={profile} />
                      </motion.div>
                    </TabsContent>
                  )}

                  {activeTab === 'household' && (
                    <TabsContent
                      key="household"
                      value="household"
                      className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                      data-testid="household-section"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <HouseholdSection profile={profile} />
                      </motion.div>
                    </TabsContent>
                  )}

                  {activeTab === 'activity' && (
                    <TabsContent
                      key="activity"
                      value="activity"
                      className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ActivityStats summary={activitySummary} />
                      </motion.div>
                    </TabsContent>
                  )}
                </AnimatePresence>
              </div>
            </Tabs>
          </motion.div>
        </div>
      </div>

      <div className="bottom-nav-spacer md:hidden" aria-hidden="true" />
      <MobileBottomNav />
    </div>
  )
}
