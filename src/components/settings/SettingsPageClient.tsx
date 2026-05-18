/* eslint-disable @typescript-eslint/consistent-type-assertions */
'use client'

import { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { User } from '@supabase/supabase-js'
import { UserProfile } from '@/types/database'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PreferencesSection } from './PreferencesSection'
import type { TasteProfileValues } from '@/components/features/profile/TasteProfileCollector'
import { UserServiceClient } from '@/lib/services/users-client'

// Lazy-load secondary tabs — only Preferences renders on first paint, so
// deferring these shaves ~20-25 KB off the initial settings route chunk.
// Each tab still mounts the moment the user clicks its trigger.
const NotificationsSection = dynamic(
  () =>
    import('./NotificationsSection').then((mod) => ({
      default: mod.NotificationsSection,
    })),
  { ssr: false, loading: () => null }
)
const AccountSection = dynamic(
  () =>
    import('./AccountSection').then((mod) => ({
      default: mod.AccountSection,
    })),
  { ssr: false, loading: () => null }
)
const SavedSearchesSection = dynamic(
  () =>
    import('./SavedSearchesSection').then((mod) => ({
      default: mod.SavedSearchesSection,
    })),
  { ssr: false, loading: () => null }
)
const TasteProfileCollector = dynamic(
  () =>
    import('@/components/features/profile/TasteProfileCollector').then(
      (mod) => ({ default: mod.TasteProfileCollector })
    ),
  { ssr: false, loading: () => null }
)
import {
  Settings,
  Bell,
  User as UserIcon,
  Search,
  ArrowLeft,
  DollarSign,
  MapPin,
  Mail,
  Heart,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { m, AnimatePresence, type Variants } from 'framer-motion'
import { MobileBottomNav } from '@/components/layouts/MobileBottomNav'
import {
  DEFAULT_PRICE_RANGE,
  DEFAULT_SEARCH_RADIUS,
} from '@/lib/constants/preferences'
import { toast } from 'sonner'

interface SettingsPageClientProps {
  user: User
  profile: UserProfile
  initialTab?: string
}

type SaveState = {
  isSaving: boolean
  hasUnsavedChanges: boolean
  lastSavedAt?: Date | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isNumber = (value: unknown): value is number => typeof value === 'number'
const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean'
const parseNumber = (value: unknown): number | undefined =>
  isNumber(value) ? value : undefined
const parsePriceRange = (value: unknown): [number, number] | undefined => {
  if (Array.isArray(value) && value.length === 2) {
    const [min, max] = value
    if (isNumber(min) && isNumber(max)) return [min, max]
  }
  if (isRecord(value)) {
    const min = value.min
    const max = value.max
    if (isNumber(min) && isNumber(max)) return [min, max]
  }
  return undefined
}
const parseBooleanRecord = (
  value: unknown
): Record<string, boolean> | undefined => {
  if (!isRecord(value)) return undefined
  const record: Record<string, boolean> = {}
  let hasValue = false
  for (const [key, entryValue] of Object.entries(value)) {
    if (isBoolean(entryValue)) {
      record[key] = entryValue
      hasValue = true
    }
  }
  return hasValue ? record : undefined
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
      value: 'taste-profile',
      label: 'Taste Profile',
      description: 'Aesthetics & lifestyle',
      icon: Heart,
    },
    {
      value: 'account',
      label: 'Account',
      description: 'Security & sessions',
      icon: UserIcon,
    },
  ] satisfies ReadonlyArray<{
    value:
      | 'preferences'
      | 'notifications'
      | 'saved-searches'
      | 'taste-profile'
      | 'account'
    label: string
    description: string
    icon: typeof Settings
  }>
  type TabValue = (typeof tabOptions)[number]['value']

  const isTabValue = (value: string): value is TabValue =>
    tabOptions.some((tab) => tab.value === value)
  const defaultTab: TabValue =
    initialTab && isTabValue(initialTab) ? initialTab : 'preferences'

  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab)
  const [profileState, setProfileState] = useState(profile)
  const handleTabChange = (value: string) => {
    if (isTabValue(value)) {
      setActiveTab(value)
    }
  }
  const preferences = useMemo(() => {
    const prefs = isRecord(profileState.preferences)
      ? profileState.preferences
      : {}
    const notifications = isRecord(prefs.notifications)
      ? {
          email: parseBooleanRecord(prefs.notifications.email),
          push: parseBooleanRecord(prefs.notifications.push),
          sms: parseBooleanRecord(prefs.notifications.sms),
        }
      : undefined
    return {
      priceRange: parsePriceRange(prefs.priceRange),
      searchRadius: parseNumber(prefs.searchRadius),
      notifications,
    }
  }, [profileState.preferences])
  const priceRange = preferences.priceRange || DEFAULT_PRICE_RANGE
  const searchRadius = preferences.searchRadius || DEFAULT_SEARCH_RADIUS
  const enabledAlerts = useMemo<number>(() => {
    const notificationChannels: Record<
      string,
      Record<string, boolean> | undefined
    > = preferences.notifications ?? {}
    return Object.values(notificationChannels).reduce((count, channel) => {
      const channelToggles = isRecord(channel)
        ? Object.values(channel).filter(Boolean)
        : []
      return count + channelToggles.length
    }, 0)
  }, [preferences.notifications])

  type OverviewCard = {
    label: string
    value: string
    icon: typeof Settings
    gradient: string
    iconColor: string
    tab: TabValue
    sectionId: string
  }
  const overviewCards: OverviewCard[] = [
    {
      label: 'Budget focus',
      value: `$${priceRange[0].toLocaleString()} – $${priceRange[1].toLocaleString()}`,
      icon: DollarSign,
      gradient: 'from-emerald-500/20 to-emerald-600/5',
      iconColor: 'text-emerald-400',
      tab: 'preferences',
      sectionId: 'price-range',
    },
    {
      label: 'Search radius',
      value: `${searchRadius} miles`,
      icon: MapPin,
      gradient: 'from-hm-accent/20 to-hm-accent-strong/5',
      iconColor: 'text-hm-accent',
      tab: 'preferences',
      sectionId: 'search-radius',
    },
    {
      label: 'Alerts enabled',
      value:
        enabledAlerts > 0 ? `${enabledAlerts} toggles on` : 'All alerts off',
      icon: Bell,
      gradient: 'from-amber-500/20 to-amber-600/5',
      iconColor: 'text-amber-400',
      tab: 'notifications',
      sectionId: 'notification-preferences',
    },
    {
      label: 'Account email',
      value: user.email || 'Not set',
      icon: Mail,
      gradient: 'from-hm-accent-strong/20 to-hm-accent-strong/5',
      iconColor: 'text-hm-accent-strong',
      tab: 'account',
      sectionId: 'account-info',
    },
  ]

  const handleProfileUpdate = (updated: UserProfile) => {
    setProfileState(updated)
  }

  const handleTasteProfileSave = useCallback(
    async (values: TasteProfileValues) => {
      const existingPrefs =
        typeof profileState.preferences === 'object' &&
        profileState.preferences !== null
          ? (profileState.preferences as Record<string, unknown>)
          : {}
      const updatedPreferences = {
        ...existingPrefs,
        tasteProfile: {
          aesthetics: values.aesthetics,
          lifestyle: values.lifestyle,
          updatedAt: new Date().toISOString(),
        },
      }
      try {
        const updated = await UserServiceClient.updateProfile(user.id, {
          preferences: updatedPreferences,
        })
        setProfileState(updated)
        toast.success('Taste profile saved')
      } catch {
        toast.error('Failed to save taste profile')
        throw new Error('Save failed')
      }
    },
    [profileState.preferences, user.id]
  )

  const tasteProfileInitialValues = useMemo(():
    | TasteProfileValues
    | undefined => {
    const prefs = profileState.preferences
    if (typeof prefs !== 'object' || prefs === null) return undefined
    const raw = (prefs as Record<string, unknown>).tasteProfile
    if (typeof raw !== 'object' || raw === null) return undefined
    const tp = raw as Record<string, unknown>
    const aesthetics = Array.isArray(tp.aesthetics)
      ? (tp.aesthetics as unknown[]).filter(
          (a): a is string => typeof a === 'string'
        )
      : []
    const ls =
      typeof tp.lifestyle === 'object' && tp.lifestyle !== null
        ? (tp.lifestyle as Record<string, unknown>)
        : {}
    const lifestyle: Record<string, number> = {}
    for (const [k, v] of Object.entries(ls)) {
      if (typeof v === 'number') lifestyle[k] = v
    }
    return { aesthetics, lifestyle }
  }, [profileState.preferences])

  const [preferencesSaveState, setPreferencesSaveState] = useState<SaveState>({
    isSaving: false,
    hasUnsavedChanges: false,
    lastSavedAt: null,
  })
  const [notificationsSaveState, setNotificationsSaveState] =
    useState<SaveState>({
      isSaving: false,
      hasUnsavedChanges: false,
      lastSavedAt: null,
    })

  const aggregatedSaveState = useMemo(() => {
    const lastSavedAt =
      (preferencesSaveState.lastSavedAt &&
        (!notificationsSaveState.lastSavedAt ||
          preferencesSaveState.lastSavedAt >
            notificationsSaveState.lastSavedAt) &&
        preferencesSaveState.lastSavedAt) ||
      notificationsSaveState.lastSavedAt ||
      null

    return {
      isSaving:
        preferencesSaveState.isSaving || notificationsSaveState.isSaving,
      hasUnsavedChanges:
        preferencesSaveState.hasUnsavedChanges ||
        notificationsSaveState.hasUnsavedChanges,
      lastSavedAt,
    }
  }, [preferencesSaveState, notificationsSaveState])

  const handleOverviewClick = useCallback(
    (tab: TabValue, sectionId?: string) => {
      setActiveTab(tab)
      if (!sectionId) return
      window.setTimeout(() => {
        const target = document.getElementById(sectionId)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 120)
    },
    []
  )

  const showReturnHighlight =
    Boolean(aggregatedSaveState.lastSavedAt) &&
    !aggregatedSaveState.hasUnsavedChanges &&
    !aggregatedSaveState.isSaving

  return (
    <div className="gradient-grid-bg text-hm-ink min-h-screen pb-6">
      {/* Hero Header */}
      <m.section
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
          <div className="bg-hm-accent-strong/[0.04] absolute -top-20 right-1/4 h-[400px] w-[400px] rounded-full blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          {/* Back navigation */}
          <m.div
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
          </m.div>

          {/* Header content */}
          <m.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between"
          >
            <m.div variants={itemVariants} className="max-w-2xl space-y-4">
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
            </m.div>

            <m.div variants={itemVariants}>
              <Link href="/profile">
                <Button
                  variant="outline"
                  className="text-hm-stone-300 border-white/10 bg-white/5 px-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  View Profile
                </Button>
              </Link>
            </m.div>
          </m.div>

          {/* Overview cards */}
          <m.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {overviewCards.map((card, index) => {
              const Icon = card.icon
              return (
                <m.button
                  key={card.label}
                  variants={itemVariants}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  className={`group relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br ${card.gradient} p-3 text-left backdrop-blur-sm transition-all hover:border-white/10 sm:rounded-2xl sm:p-4`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  type="button"
                  onClick={() => handleOverviewClick(card.tab, card.sectionId)}
                  aria-label={`Open ${card.label} settings`}
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
                      className="text-hm-stone-200 mt-1.5 truncate text-base font-medium sm:mt-2 sm:text-lg"
                      title={card.value}
                    >
                      {card.value}
                    </p>
                  </div>
                </m.button>
              )
            })}
          </m.div>
        </div>
      </m.section>

      {/* Main content */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <m.div
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
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1.5 backdrop-blur-sm sm:gap-2 sm:p-2 md:grid-cols-5">
              {tabOptions.map(({ value, label, description, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="group flex h-auto min-h-[64px] w-full flex-col items-start gap-2 rounded-lg border border-transparent px-3 py-2 text-left transition-all data-[state=active]:border-white/10 data-[state=active]:bg-white/10 data-[state=active]:shadow-lg sm:min-h-[80px] sm:px-4 sm:py-3"
                >
                  <div className="text-hm-stone-400 flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 transition-colors group-data-[state=active]:bg-amber-500/10 group-data-[state=active]:text-amber-400 sm:h-8 sm:w-8">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div>
                    <p className="text-hm-stone-300 text-xs font-medium group-data-[state=active]:text-white sm:text-sm">
                      {label}
                    </p>
                    <p className="text-hm-stone-500 group-data-[state=active]:text-hm-stone-400 text-[11px] sm:text-xs">
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
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PreferencesSection
                      user={user}
                      profile={profileState}
                      onProfileUpdate={handleProfileUpdate}
                      onSaveStateChange={setPreferencesSaveState}
                    />
                  </m.div>
                </TabsContent>
              )}

              {activeTab === 'notifications' && (
                <TabsContent
                  value="notifications"
                  className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                >
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <NotificationsSection
                      user={user}
                      profile={profileState}
                      onProfileUpdate={handleProfileUpdate}
                      onSaveStateChange={setNotificationsSaveState}
                    />
                  </m.div>
                </TabsContent>
              )}

              {activeTab === 'saved-searches' && (
                <TabsContent
                  value="saved-searches"
                  className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                >
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SavedSearchesSection userId={user.id} />
                  </m.div>
                </TabsContent>
              )}

              {activeTab === 'taste-profile' && (
                <TabsContent
                  value="taste-profile"
                  className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                >
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TasteProfileCollector
                      onSave={handleTasteProfileSave}
                      initialValues={tasteProfileInitialValues}
                    />
                  </m.div>
                </TabsContent>
              )}

              {activeTab === 'account' && (
                <TabsContent
                  value="account"
                  className="mt-0 space-y-6 focus-visible:ring-0 focus-visible:outline-none"
                >
                  <m.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AccountSection user={user} />
                  </m.div>
                </TabsContent>
              )}
            </AnimatePresence>
          </Tabs>
        </m.div>
      </div>

      <div className="bottom-nav-spacer md:hidden" aria-hidden="true" />
      <div className="mx-auto mt-6 max-w-6xl px-4 pb-8 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-hm-stone-200 text-sm font-medium">
              {aggregatedSaveState.isSaving
                ? 'Saving updates...'
                : aggregatedSaveState.hasUnsavedChanges
                  ? 'Changes will auto-save shortly.'
                  : aggregatedSaveState.lastSavedAt
                    ? 'All settings saved.'
                    : 'No changes yet.'}
            </p>
            <p className="text-hm-stone-500 text-xs">
              Head back to the dashboard to keep browsing.
            </p>
          </div>
          <Link href="/dashboard">
            <Button
              disabled={aggregatedSaveState.isSaving}
              className={
                showReturnHighlight
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400'
                  : 'text-hm-stone-300 border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }
              variant={showReturnHighlight ? 'default' : 'outline'}
            >
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
