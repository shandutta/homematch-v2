'use client'

import { useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile, UserPreferences } from '@/types/database'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PreferencesSection } from './PreferencesSection'
import { NotificationsSection } from './NotificationsSection'
import { AccountSection } from './AccountSection'
import { SavedSearchesSection } from './SavedSearchesSection'
import {
  Settings,
  Bell,
  User as UserIcon,
  Search,
  ArrowLeft,
  DollarSign,
  MapPin,
  Mail,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

interface SettingsPageClientProps {
  user: User
  profile: UserProfile
  initialTab?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },
  },
}

export function SettingsPageClient({
  user,
  profile,
  initialTab,
}: SettingsPageClientProps) {
  const tabOptions = [
    {
      value: 'preferences',
      label: 'Preferences',
      description: 'Budget, beds & property types',
      icon: Settings,
    },
    {
      value: 'notifications',
      label: 'Notifications',
      description: 'Email, push & SMS alerts',
      icon: Bell,
    },
    {
      value: 'saved-searches',
      label: 'Saved searches',
      description: 'Manage dashboard alerts',
      icon: Search,
    },
    {
      value: 'account',
      label: 'Account',
      description: 'Security & sessions',
      icon: UserIcon,
    },
  ] as const
  type TabValue = (typeof tabOptions)[number]['value']

  const isValidInitialTab = tabOptions.some((tab) => tab.value === initialTab)
  const defaultTab: TabValue = isValidInitialTab
    ? (initialTab as TabValue)
    : 'preferences'

  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab)
  const [profileState, setProfileState] = useState(profile)
  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue)
  }
  type PreferencesSnapshot = UserPreferences & {
    priceRange?: [number, number]
    bedrooms?: number
    bathrooms?: number
    propertyTypes?: Record<string, boolean>
    mustHaves?: Record<string, boolean>
    searchRadius?: number
    notifications?: {
      email?: Record<string, boolean>
      push?: Record<string, boolean>
      sms?: Record<string, boolean>
    }
  }

  const preferences = useMemo(
    () => (profileState.preferences || {}) as PreferencesSnapshot,
    [profileState.preferences]
  )
  const priceRange = preferences.priceRange || [200000, 800000]
  const searchRadius = preferences.searchRadius || 10
  const enabledAlerts = useMemo(() => {
    const notificationChannels = preferences.notifications || {}
    return Object.values(notificationChannels).reduce((count, channel) => {
      const channelToggles = Object.values(channel || {}).filter(Boolean)
      return count + channelToggles.length
    }, 0)
  }, [preferences.notifications])

  const overviewCards = [
    {
      label: 'Budget focus',
      value: `$${priceRange[0].toLocaleString()} – $${priceRange[1].toLocaleString()}`,
      icon: DollarSign,
      gradient: 'from-emerald-500/20 to-emerald-600/5',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Search radius',
      value: `${searchRadius} miles`,
      icon: MapPin,
      gradient: 'from-sky-500/20 to-sky-600/5',
      iconColor: 'text-sky-400',
    },
    {
      label: 'Alerts enabled',
      value:
        enabledAlerts > 0 ? `${enabledAlerts} toggles on` : 'All alerts off',
      icon: Bell,
      gradient: 'from-amber-500/20 to-amber-600/5',
      iconColor: 'text-amber-400',
    },
    {
      label: 'Account email',
      value: user.email || 'Not set',
      icon: Mail,
      gradient: 'from-violet-500/20 to-violet-600/5',
      iconColor: 'text-violet-400',
    },
  ]

  const handleProfileUpdate = (updated: UserProfile) => {
    setProfileState(updated)
  }

  return (
    <div className="gradient-grid-bg min-h-screen pb-16 text-white">
      {/* Hero Header */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative isolate overflow-hidden border-b border-white/5"
        data-testid="settings-header"
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -top-40 left-1/3 h-[500px] w-[500px] rounded-full bg-amber-500/[0.03] blur-[100px]" />
          <div className="absolute -top-20 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-500/[0.04] blur-[80px]" />
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

          {/* Header content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between"
          >
            <motion.div variants={itemVariants} className="max-w-2xl space-y-4">
              <p className="text-hm-stone-500 text-xs font-medium tracking-[0.2em] uppercase">
                Control Center
              </p>
              <h1 className="font-heading text-hm-stone-200 text-3xl font-semibold tracking-tight sm:text-4xl">
                Settings
              </h1>
              <p className="text-hm-stone-400 text-sm leading-relaxed">
                Fine-tune your search preferences, alerts, and account security.
                Every change here immediately shapes the homes we surface for
                you.
              </p>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Link href="/profile">
                <Button
                  variant="outline"
                  className="text-hm-stone-300 border-white/10 bg-white/5 px-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  View Profile
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Overview cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {overviewCards.map((card, index) => {
              const Icon = card.icon
              return (
                <motion.div
                  key={card.label}
                  variants={itemVariants}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br ${card.gradient} p-4 backdrop-blur-sm transition-all hover:border-white/10`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${card.iconColor}`} />
                      <p className="text-hm-stone-500 text-xs font-medium tracking-[0.1em] uppercase">
                        {card.label}
                      </p>
                    </div>
                    <p
                      className="text-hm-stone-200 mt-2 truncate text-lg font-medium"
                      title={card.value}
                    >
                      {card.value}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </motion.section>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="card-luxury overflow-hidden p-6 sm:p-8"
        >
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="space-y-8"
          >
            {/* Tab navigation */}
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 backdrop-blur-sm md:grid-cols-4">
              {tabOptions.map(({ value, label, description, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="group flex h-auto min-h-[80px] w-full flex-col items-start gap-2 rounded-lg border border-transparent px-4 py-3 text-left transition-all data-[state=active]:border-white/10 data-[state=active]:bg-white/10 data-[state=active]:shadow-lg"
                >
                  <div className="text-hm-stone-400 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 transition-colors group-data-[state=active]:bg-amber-500/10 group-data-[state=active]:text-amber-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-hm-stone-300 text-sm font-medium group-data-[state=active]:text-white">
                      {label}
                    </p>
                    <p className="text-hm-stone-500 group-data-[state=active]:text-hm-stone-400 text-xs">
                      {description}
                    </p>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'preferences' && (
                <TabsContent
                  value="preferences"
                  className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PreferencesSection
                      user={user}
                      profile={profileState}
                      onProfileUpdate={handleProfileUpdate}
                    />
                  </motion.div>
                </TabsContent>
              )}

              {activeTab === 'notifications' && (
                <TabsContent
                  value="notifications"
                  className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <NotificationsSection
                      user={user}
                      profile={profileState}
                      onProfileUpdate={handleProfileUpdate}
                    />
                  </motion.div>
                </TabsContent>
              )}

              {activeTab === 'saved-searches' && (
                <TabsContent
                  value="saved-searches"
                  className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SavedSearchesSection userId={user.id} />
                  </motion.div>
                </TabsContent>
              )}

              {activeTab === 'account' && (
                <TabsContent
                  value="account"
                  className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AccountSection user={user} />
                  </motion.div>
                </TabsContent>
              )}
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}
