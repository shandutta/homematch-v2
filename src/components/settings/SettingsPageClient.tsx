'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { UserProfile } from '@/types/database'
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
} from 'lucide-react'
import Link from 'next/link'

interface SettingsPageClientProps {
  user: User
  profile: UserProfile
}

export function SettingsPageClient({ user, profile }: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState('preferences')

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-purple-900/10 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-purple-300 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-3xl font-bold">Settings</h1>
            </div>
            <Link href="/profile">
              <button className="text-purple-300 transition-colors hover:text-white">
                View Profile
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="border border-purple-500/20 bg-purple-900/20">
            <TabsTrigger
              value="preferences"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="saved-searches"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Saved Searches
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preferences" className="space-y-6">
            <PreferencesSection user={user} profile={profile} />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationsSection user={user} profile={profile} />
          </TabsContent>

          <TabsContent value="saved-searches" className="space-y-6">
            <SavedSearchesSection userId={user.id} />
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <AccountSection user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
