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
  Map,
  SlidersHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SettingsPageClientProps {
  user: User
  profile: UserProfile
}

export function SettingsPageClient({ user, profile }: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState('preferences')
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
    () => (profile.preferences || {}) as PreferencesSnapshot,
    [profile.preferences]
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

  const overviewCards = [
    {
      label: 'Budget focus',
      value: `$${priceRange[0].toLocaleString()} – $${priceRange[1].toLocaleString()}`,
      icon: DollarSign,
    },
    {
      label: 'Search radius',
      value: `${searchRadius} miles`,
      icon: Map,
    },
    {
      label: 'Alerts enabled',
      value:
        enabledAlerts > 0 ? `${enabledAlerts} toggles on` : 'All alerts off',
      icon: Bell,
    },
    {
      label: 'Account email',
      value: user.email || 'Not set',
      icon: SlidersHorizontal,
    },
  ]

  return (
    <div className="text-primary-foreground min-h-screen pb-8">
      <section
        className="shadow-token-xl border-white/10 bg-white/5"
        data-testid="settings-header"
      >
        <div className="relative container mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-6">
            <Link
              href="/dashboard"
              className="flex w-fit items-center gap-2 text-sm text-white/70 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <p className="text-sm tracking-[0.2em] text-white/60 uppercase">
                  Control center
                </p>
                <h1 className="text-token-4xl font-bold text-white">
                  Settings
                </h1>
                <p className="text-base leading-relaxed text-white/70">
                  Fine-tune your search preferences, alerts, and account
                  security. Every change here immediately shapes the homes we
                  surface for you.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 text-white"
                >
                  <Link href="/profile">View Profile</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {overviewCards.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/70 shadow-inner backdrop-blur"
                >
                  <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase">
                    <Icon className="h-4 w-4 text-white/60" />
                    <span>{label}</span>
                  </div>
                  <p
                    className="truncate text-left text-lg font-semibold text-white"
                    title={value}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-6xl px-4 pt-8">
        <div className="rounded-[36px] border border-white/10 bg-[#070b18]/90 px-8 py-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-8"
          >
            <TabsList className="relative z-10 mb-6 grid h-auto w-full grid-cols-2 gap-2 overflow-hidden rounded-2xl border border-white/20 bg-white/20 p-2 text-white shadow-[0_20px_45px_rgba(8,10,30,0.35)] backdrop-blur md:grid-cols-4">
              {tabOptions.map(({ value, label, description, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    'flex h-auto min-h-[92px] w-full flex-col items-start gap-2 rounded-xl border border-transparent px-4 py-3 text-left text-sm leading-tight font-medium whitespace-normal text-white/85 transition hover:text-white data-[state=active]:bg-white/20 data-[state=active]:text-white'
                  )}
                >
                  <Icon className="h-4 w-4 text-white" />
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className="text-xs text-white/60">{description}</p>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent
              value="preferences"
              className="relative z-20 mt-6 space-y-6"
            >
              <div className="relative z-20 rounded-[30px] border border-white/10 bg-[#050811]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
                <PreferencesSection user={user} profile={profile} />
              </div>
            </TabsContent>

            <TabsContent
              value="notifications"
              className="relative z-20 mt-6 space-y-6"
            >
              <div className="relative z-20 rounded-[30px] border border-white/10 bg-[#050811]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
                <NotificationsSection user={user} profile={profile} />
              </div>
            </TabsContent>

            <TabsContent
              value="saved-searches"
              className="relative z-20 mt-6 space-y-6"
            >
              <div className="relative z-20 rounded-[30px] border border-white/10 bg-[#050811]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
                <SavedSearchesSection userId={user.id} />
              </div>
            </TabsContent>

            <TabsContent
              value="account"
              className="relative z-20 mt-6 space-y-6"
            >
              <div className="relative z-20 rounded-[30px] border border-white/10 bg-[#050811]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
                <AccountSection user={user} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
